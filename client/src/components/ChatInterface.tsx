import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeedbackModal } from './FeedbackModal';
import { CollapsibleValueList } from '@/components/CollapsibleValueList';
import { CollapsibleResultTable } from '@/components/CollapsibleResultTable';
import { ResultChart } from '@/components/ResultChart';
import { useDatabase } from '@/hooks/use-database';
import { useToast } from '@/hooks/use-toast';
import { databaseApi } from '@/lib/databaseApi';
import {
  Send, Bot, User, Code, Copy, ThumbsUp, ThumbsDown, Loader2, Trash2, BarChart3
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string | string[];
  sqlQuery?: string;
  queryLogId?: number;
  timestamp: Date;
  executionTime?: number;
  columns?: string[];
  rows?: (string | number | null)[][];
  info?: string;
}

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [selectedSql, setSelectedSql] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<{ show: boolean; queryLogId?: number }>({ show: false });
  const [showChartMsgId, setShowChartMsgId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isConnected, activeConnection } = useDatabase();

  const [tableNames, setTableNames] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      databaseApi.getTableNames()
        .then((tables) => setTableNames(Array.isArray(tables) ? tables : []))
        .catch(() => setTableNames([]));
    }
  }, [isConnected, activeConnection]);

  function hasDictionaryForTable(table: string | null): boolean {
    if (!table || !activeConnection?.data_dictionary) return false;
    if (activeConnection.dictionary_table && typeof activeConnection.data_dictionary === "object") {
      return Boolean(activeConnection.dictionary_table === table && Object.keys(activeConnection.data_dictionary).length > 0);
    }
    if (!activeConnection.dictionary_table && typeof activeConnection.data_dictionary === "object") {
      return Object.keys(activeConnection.data_dictionary).length > 0;
    }
    return false;
  }

  // Historial del backend
  const { data: history } = useQuery({
    queryKey: ['/api/queries/history'],
    enabled: isConnected,
  });

  useEffect(() => {
    if (history?.queries && messages.length === 0) {
      const historyMessages: ChatMessage[] = history.queries
        .slice(0, 10)
        .reverse()
        .flatMap(query => [
          {
            id: `user-${query.id}`,
            type: 'user' as const,
            content: query.naturalLanguageQuery,
            timestamp: new Date(query.createdAt),
          },
          {
            id: `assistant-${query.id}`,
            type: 'assistant' as const,
            content: query.response || 'No response available',
            sqlQuery: query.sqlQuery || undefined,
            queryLogId: query.id,
            timestamp: new Date(query.createdAt),
            executionTime: query.executionTime || undefined,
            columns: query.columns || undefined,
            rows: query.rows || undefined,
          },
        ]);
      setMessages(historyMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  // SCROLL SIEMPRE ABAJO cuando cambian los mensajes:
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { question: string, table: string }) => {
      return await databaseApi.askLLMQuestion({
        question: payload.question,
        table: payload.table,
        connectionId: activeConnection?.id,
      });
    },
    onSuccess: (data) => {
      // Maneja respuesta tipo info (saludo, sin datos)
      if (data.info) {
        const assistantMessage: ChatMessage = {
          id: `assistant-info-${Date.now()}`,
          type: 'assistant',
          content: data.info,
          timestamp: new Date(),
          info: data.info,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setShowChartMsgId(null);
        return;
      }

      let answerContent: string | string[] = data.answer || 'Consulta realizada correctamente.';
      let columns = data.columns || undefined;
      let rows = data.rows || undefined;

      // Conversión a lista si es respuesta tipo lista
      if (!columns && typeof answerContent === "string") {
        const lines = answerContent.split('\n').map(l => l.trim()).filter(Boolean);
        if (
          lines.length > 5 &&
          lines.every(l => l.length < 30 && !l.includes(' '))
        ) {
          answerContent = lines;
        }
      }
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: answerContent,
        sqlQuery: data.sql_query,
        queryLogId: data.query_log_id,
        timestamp: new Date(),
        executionTime: data.executionTime,
        columns,
        rows,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setShowChartMsgId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/queries/history'] });
    },
    onError: (error: any) => {
      if (error?.response?.data?.detail) {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            type: 'assistant',
            content: error.response.data.detail,
            timestamp: new Date(),
          }
        ]);
        return;
      }
      if (error?.answer) {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            type: 'assistant',
            content: error.answer,
            timestamp: new Date(),
          }
        ]);
        return;
      }
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: error?.message || "Error inesperado. Intenta de nuevo.",
          timestamp: new Date(),
        }
      ]);
      toast({
        title: "Error",
        description: error?.message || "Error inesperado. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isConnected) return;
    if (!selectedTable) {
      toast({ title: "Selecciona una tabla", variant: "destructive" });
      return;
    }
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    sendMessageMutation.mutate({
      question: message.trim(),
      table: selectedTable,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleShowSql = (sql: string) => {
    setSelectedSql(sql);
    setShowSqlDialog(true);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(selectedSql);
      toast({
        title: "¡Copiado!",
        description: "Consulta SQL copiada al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar la consulta SQL",
        variant: "destructive",
      });
    }
  };

  const handleFeedback = (queryLogId: number) => {
    setFeedbackModal({ show: true, queryLogId });
  };

  const clearChat = () => {
    setMessages([]);
    queryClient.removeQueries({ queryKey: ['/api/queries/history'] });
    queryClient.setQueryData(['/api/queries/history'], { queries: [] });
    toast({
      title: "Chat limpiado",
      description: "El historial del chat ha sido eliminado",
    });
  };

  const quickSuggestions = [
    "¿Cuántos usuarios hay en la base de datos?",
    "Muéstrame los 10 mejores clientes por ingresos",
    "¿Qué tablas están disponibles?",
    "Encuentra productos con bajo inventario",
  ];

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-database text-red-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Sin Base de Datos Conectada</h3>
            <p className="text-muted-foreground mb-4">
              Necesitas conectarte a una base de datos antes de poder comenzar a chatear.
            </p>
            <Button asChild>
              <a href="/database">Conectar Base de Datos</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div className="border-b border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="font-medium">Conectado a: {activeConnection?.database}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Chat
          </Button>
        </div>
      </div>

      {/* Selector de tabla y mensaje de diccionario */}
      <div className="px-4 pt-4 flex-shrink-0">
        <div className="flex gap-4 mb-2 items-end">
          <div>
            <label className="block mb-1 text-xs font-medium text-muted-foreground">Tabla:</label>
            <select
              className="border rounded px-2 py-1"
              value={selectedTable ?? ''}
              onChange={e => setSelectedTable(e.target.value || null)}
            >
              <option value="">Selecciona tabla</option>
              {tableNames.map((table) => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedTable && !hasDictionaryForTable(selectedTable) && (
          <div className="mt-2 p-2 rounded bg-orange-50 border border-orange-200 text-orange-700 text-xs">
            <b>No hay diccionario de datos asociado a esta tabla.</b><br />
            Para obtener mejores respuestas y más contexto,
            <b> recomendamos asociar un diccionario de datos</b> desde la configuración de conexiones.<br />
            <Button
              className="mt-2 underline text-blue-700 hover:text-blue-900"
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/database'}
              type="button"
            >
              Ir a configuración de conexión
            </Button>
          </div>
        )}
      </div>

      {/* Mensajes del chat */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={messagesContainerRef}
          className="overflow-y-auto flex-1 min-h-0 px-4 py-4"
          style={{
            maxHeight: '100%',
            minHeight: '200px',
          }}
        >
          <div className="space-y-4 max-w-4xl mx-auto min-h-[200px]">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Inicia una Conversación</h3>
                <p className="text-muted-foreground mb-6">
                  Haz preguntas sobre tu base de datos en español. ¡Las convertiré a SQL y obtendré tus respuestas!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {quickSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => setMessage(suggestion)}
                      className="text-left h-auto p-3 whitespace-normal"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl ${msg.type === 'user' ? 'ml-12' : 'mr-12'}`}>
                  <div className="flex items-start space-x-3">
                    {msg.type === 'assistant' && (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div
                        className={`rounded-lg p-4 ${
                          msg.type === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        }`}
                      >
                        {/* --- Mensaje tipo INFO (saludo, sin datos ni tablas ni gráfico) --- */}
                        {msg.type === 'assistant' && msg.info ? (
                          <div>{msg.info}</div>
                        ) : msg.type === 'assistant' && Array.isArray(msg.columns) && Array.isArray(msg.rows) && msg.columns.length > 1 ? (
                          <div>
                            {/* Explicación amigable */}
                            {typeof msg.content === 'string' && msg.content.length > 0 && (
                              <div className="mb-2">{msg.content}</div>
                            )}
                            <Button
                              size="sm"
                              className="mb-2"
                              variant={showChartMsgId === msg.id ? 'secondary' : 'outline'}
                              onClick={() => setShowChartMsgId(showChartMsgId === msg.id ? null : msg.id)}
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              {showChartMsgId === msg.id ? 'Ocultar gráfico' : 'Ver gráfico'}
                            </Button>
                            {showChartMsgId === msg.id && (
                              <ResultChart columns={msg.columns} rows={msg.rows} />
                            )}
                            <CollapsibleResultTable columns={msg.columns} rows={msg.rows} />
                          </div>
                        ) : msg.type === 'assistant' && Array.isArray(msg.content) && msg.content.length > 5 ? (
                          <CollapsibleValueList values={msg.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">{Array.isArray(msg.content) ? msg.content.join('\n') : msg.content}</p>
                        )}

                        {/* Badge de tiempo de ejecución solo si NO es info */}
                        {msg.type === 'assistant' && msg.executionTime && !msg.info && (
                          <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                            <Badge variant="secondary" className="text-xs">
                              Ejecutado en {msg.executionTime}ms
                            </Badge>
                          </div>
                        )}
                        {/* Mostrar ID Log solo si assistant y no info */}
                        {msg.type === 'assistant' && msg.queryLogId && !msg.info && (
                          <div className="mt-1">
                            <span className="text-[11px] text-muted-foreground select-all">
                              <b>ID Log:</b> {msg.queryLogId}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Acciones para mensajes assistant */}
                      {msg.type === 'assistant' && !msg.info && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                          {msg.sqlQuery && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowSql(msg.sqlQuery!)}
                              className="text-xs h-6"
                            >
                              <Code className="h-3 w-3 mr-1" />
                              Ver SQL
                            </Button>
                          )}
                          {msg.queryLogId && (
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback(msg.queryLogId!)}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback(msg.queryLogId!)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.type === 'user' && (
                        <div className="flex justify-end mt-2">
                          <span className="text-xs text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {msg.type === 'user' && (
                      <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-3xl mr-12">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground">Analizando tu consulta...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-200 p-4 flex-shrink-0 bg-background">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Haz una pregunta sobre tus datos..."
              disabled={sendMessageMutation.isPending || !selectedTable}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending || !selectedTable}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 max-w-4xl mx-auto">
            Prueba: "Muéstrame tendencias de ventas", "Lista todos los clientes", "Encuentra productos con bajo inventario"
          </p>
        </form>
      </div>

      {/* SQL Dialog */}
      <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Generated SQL Query
              <Button variant="outline" size="sm" onClick={handleCopySql}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
            <pre>{selectedSql}</pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackModal.show}
        queryLogId={feedbackModal.queryLogId}
        onClose={() => setFeedbackModal({ show: false })}
      />
    </div>
  );
}
