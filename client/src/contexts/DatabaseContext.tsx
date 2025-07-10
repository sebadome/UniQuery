// DatabaseContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';
import { databaseApi, type DatabaseConnection } from '@/lib/databaseApi';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface DatabaseContextType {
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastMessage: string | null;
  refreshConnections: () => Promise<void>;
  testConnection: (data: any) => Promise<boolean>;
  createConnection: (data: any) => Promise<boolean>;
  activateConnection: (connectionId: string) => Promise<void>;
  deactivateConnection: () => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  getTables: (params: any) => Promise<string[]>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Limpia el contexto cuando el usuario se desloguea
  useEffect(() => {
    if (!isAuthenticated) {
      setConnections([]);
      setActiveConnection(null);
      setIsConnected(false);
      setIsLoading(false);
      setError(null);
      setLastMessage(null);
    }
  }, [isAuthenticated]);

  // Carga las conexiones y la activa
  const refreshConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await databaseApi.getConnections();
      const active = result.find((conn: any) => conn.isActive) || null;
      setConnections(result);
      setActiveConnection(active);
      setIsConnected(!!active);
    } catch (err: any) {
      setConnections([]);
      setActiveConnection(null);
      setIsConnected(false);
      setError(err?.message || 'Error cargando conexiones');
      toast?.({
        title: "Error",
        description: err?.message || "Error cargando conexiones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated) refreshConnections();
  }, [isAuthenticated, refreshConnections]);

  // Probar conexión
  const testConnection = useCallback(
    async (data: any): Promise<boolean> => {
      setError(null);
      try {
        const res = await databaseApi.testConnection(data);
        if (!res?.success && res?.message) throw new Error(res.message);
        setLastMessage("Conexión exitosa");
        toast?.({
          title: "¡Conexión exitosa!",
          description: "La prueba de conexión fue exitosa.",
        });
        return true;
      } catch (err: any) {
        setError(err?.message || "No se pudo conectar");
        toast?.({
          title: "Error",
          description: err?.message || "No se pudo conectar a la base de datos",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  // Guardar conexión en Supabase y refrescar
  const createConnection = useCallback(
    async (data: any): Promise<boolean> => {
      setError(null);
      try {
        await databaseApi.createConnection(data);
        await refreshConnections();
        setLastMessage("Conexión guardada");
        toast?.({
          title: "Conexión guardada",
          description: "Se guardó la conexión correctamente.",
        });
        return true;
      } catch (err: any) {
        setError(err?.message || "No se pudo guardar");
        toast?.({
          title: "Error al guardar",
          description: err?.message || "No se pudo guardar la conexión",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, refreshConnections]
  );

  // Activa una conexión guardada
  const activateConnection = useCallback(
    async (connectionId: string) => {
      setError(null);
      try {
        await databaseApi.activateConnection(connectionId);
        await refreshConnections();
        setLastMessage("Conexión activada");
        toast?.({
          title: "¡Conectado!",
          description: "Conexión activada correctamente.",
        });
      } catch (err: any) {
        setError(err?.message || "No se pudo activar");
        toast?.({
          title: "Error al conectar",
          description: err?.message || "No se pudo activar la conexión",
          variant: "destructive",
        });
      }
    },
    [toast, refreshConnections]
  );

  // Desactiva la conexión activa
  const deactivateConnection = useCallback(
    async () => {
      setError(null);
      try {
        await databaseApi.deactivateConnection();
        await refreshConnections();
        setLastMessage("Conexión desactivada");
        toast?.({
          title: "Desconectado",
          description: "La conexión ha sido desactivada.",
        });
      } catch (err: any) {
        setError(err?.message || "No se pudo desconectar");
        toast?.({
          title: "Error al desconectar",
          description: err?.message || "No se pudo desconectar",
          variant: "destructive",
        });
      }
    },
    [toast, refreshConnections]
  );

  // Elimina una conexión y refresca
  const removeConnection = useCallback(
    async (connectionId: string) => {
      setError(null);
      try {
        await databaseApi.deleteConnection(connectionId);
        await refreshConnections();
        setLastMessage("Conexión eliminada");
        toast?.({
          title: "Conexión eliminada",
          description: "La conexión fue eliminada correctamente.",
        });
      } catch (err: any) {
        setError(err?.message || "No se pudo eliminar");
        toast?.({
          title: "Error al eliminar",
          description: err?.message || "No se pudo eliminar la conexión",
          variant: "destructive",
        });
      }
    },
    [toast, refreshConnections]
  );

  // Listar tablas pasando los parámetros
  const getTables = useCallback(
    async (params: any): Promise<string[]> => {
      setError(null);
      try {
        const result = await databaseApi.getTablesFromParams(params);
        if (Array.isArray(result)) return result;
        if (result && Array.isArray(result.tables)) return result.tables;
        return [];
      } catch (err: any) {
        setError(err?.message || "Error obteniendo tablas");
        toast?.({
          title: "Error al listar tablas",
          description: err?.message || "No se pudieron obtener las tablas",
          variant: "destructive",
        });
        return [];
      }
    },
    [toast]
  );

  const value: DatabaseContextType = {
    connections,
    activeConnection,
    isConnected,
    isLoading,
    error,
    lastMessage,
    refreshConnections,
    testConnection,
    createConnection,
    activateConnection,
    deactivateConnection,
    removeConnection,
    getTables,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
}
