import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { queryApi, type Query } from '@/lib/api';
import { FeedbackModal } from './FeedbackModal';
import { useDatabase } from '@/hooks/use-database';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Bot, 
  User, 
  Code, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2,
  Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sqlQuery?: string;
  queryId?: number;
  timestamp: Date;
  executionTime?: number;
}

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [selectedSql, setSelectedSql] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<{ show: boolean; queryId?: number }>({ show: false });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isConnected, activeConnection } = useDatabase();

  // Load chat history
  const { data: history } = useQuery({
    queryKey: ['/api/queries/history'],
    enabled: isConnected,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: queryApi.sendQuery,
    onSuccess: (data) => {
      // Add assistant response to messages
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: data.response,
        sqlQuery: data.sqlQuery,
        queryId: data.queryId,
        timestamp: new Date(),
        executionTime: data.executionTime,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Invalidate history to refresh it
      queryClient.invalidateQueries({ queryKey: ['/api/queries/history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Consulta falló",
        description: error.message || "Error al procesar tu consulta",
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load history into messages on component mount
  useEffect(() => {
    if (history?.queries && messages.length === 0) {
      const historyMessages: ChatMessage[] = history.queries
        .slice(0, 10) // Show last 10 queries
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
            queryId: query.id,
            timestamp: new Date(query.createdAt),
            executionTime: query.executionTime || undefined,
          },
        ]);
      
      setMessages(historyMessages);
    }
  }, [history, messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !isConnected) return;

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Send message to API
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
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

  const handleFeedback = (queryId: number) => {
    setFeedbackModal({ show: true, queryId });
  };

  const clearChat = () => {
    setMessages([]);
    // Force a re-fetch of the query client to clear cache
    queryClient.invalidateQueries({ queryKey: ['/api/queries/history'] });
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
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-slate-200 p-4">
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
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
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.type === 'assistant' && msg.executionTime && (
                        <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                          <Badge variant="secondary" className="text-xs">
                            Ejecutado en {msg.executionTime}ms
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Assistant message actions */}
                    {msg.type === 'assistant' && (
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
                        
                        {msg.queryId && (
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(msg.queryId!)}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(msg.queryId!)}
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

          {/* Loading indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex justify-start">
              <div className="max-w-3xl mr-12">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-muted-foreground">Analyzing your query...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-slate-200 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Haz una pregunta sobre tus datos..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
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
        queryId={feedbackModal.queryId}
        onClose={() => setFeedbackModal({ show: false })}
      />
    </div>
  );
}
