import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useDatabase } from '@/hooks/use-database';
import { queryApi } from '@/lib/api';
import { Link } from 'wouter';
import {
  Database,
  MessageSquare,
  TrendingUp,
  Clock,
  Users,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected, activeConnection } = useDatabase();

  // Load recent queries
  const { data: queryHistory } = useQuery({
    queryKey: ['/api/queries/history'],
    enabled: isConnected,
  });

  const recentQueries = queryHistory?.queries?.slice(0, 5) || [];
  const totalQueries = queryHistory?.queries?.length || 0;
  const successfulQueries = queryHistory?.queries?.filter(q => q.isSuccessful)?.length || 0;
  const successRate = totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          ¡Bienvenido de vuelta, {user?.user_metadata?.name?.split(' ')[0] ?? user?.email ?? ""}!
        </h1>

        <p className="text-muted-foreground">
          Consulta tus bases de datos usando lenguaje natural
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de la Base de Datos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-700">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700">No Conectado</span>
                </>
              )}
            </div>
            {isConnected && activeConnection && (
              <p className="text-xs text-muted-foreground mt-1">
                {activeConnection.database}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQueries}</div>
            <p className="text-xs text-muted-foreground">
              Consultas de todos los tiempos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulQueries} de {totalQueries} exitosas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio de Respuesta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queryHistory?.queries?.length ?
                Math.round(queryHistory.queries.reduce((acc, q) => acc + (q.executionTime || 0), 0) / queryHistory.queries.length)
                : 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Tiempo promedio de ejecución
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Conexión a Base de Datos</CardTitle>
            <CardDescription>
              {isConnected ? 'Administra tu conexión activa' : 'Conéctate para comenzar a consultar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected && activeConnection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-900">{activeConnection.name}</p>
                      <p className="text-sm text-green-700">
                        {activeConnection.type} • {activeConnection.database}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Activa
                  </Badge>
                </div>
                <Button asChild className="w-full">
                  <Link href="/chat">Comenzar a Consultar</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 mr-3" />
                  <div>
                    <p className="font-medium text-red-900">No hay base de datos conectada</p>
                    <p className="text-sm text-red-700">Conéctate a tu base de datos para comenzar a consultar</p>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link href="/database">Conectar Base de Datos</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Consultas Recientes</CardTitle>
            <CardDescription>
              Tus últimas interacciones con la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentQueries.length > 0 ? (
              <div className="space-y-4">
                {recentQueries.map((query) => (
                  <div key={query.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${query.isSuccessful ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        {query.naturalLanguageQuery}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-slate-500">
                          {new Date(query.createdAt).toLocaleDateString()}
                        </p>
                        {query.executionTime && (
                          <Badge variant="outline" className="text-xs">
                            {query.executionTime}ms
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/chat">Ver Todas las Consultas</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Aún no hay consultas</p>
                {isConnected ? (
                  <Button asChild>
                    <Link href="/chat">Realizar Primera Consulta</Link>
                  </Button>
                ) : (
                  <p className="text-sm text-slate-400">Primero conecta a una base de datos</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Comenzar</CardTitle>
            <CardDescription>
              Sigue estos pasos para comenzar a consultar tu base de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">1. Conectar Base de Datos</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Agrega los detalles de conexión de tu base de datos
                </p>
                <Button size="sm" asChild>
                  <Link href="/database">Conectar</Link>
                </Button>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium mb-2">2. Comenzar a Chatear</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Haz preguntas en lenguaje natural
                </p>
                <Button size="sm" variant="outline" disabled>
                  Chat
                </Button>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium mb-2">3. Obtener Información</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Recibe información de datos y consultas SQL
                </p>
                <Button size="sm" variant="outline" disabled>
                  Analizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
