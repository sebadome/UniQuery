import { useState, useEffect, useCallback } from 'react';
import { databaseApi, type DatabaseConnection } from '@/lib/databaseApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export interface DatabaseState {
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;
  isLoading: boolean;
  isConnected: boolean;
}

export function useDatabase() {
  const [state, setState] = useState<DatabaseState>({
    connections: [],
    activeConnection: null,
    isLoading: false,
    isConnected: false,
  });

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [jwt, setJwt] = useState<string | null>(null);

  // Obtén el JWT al autenticarse el usuario
  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated) {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data } = await supabase.auth.getSession();
        setJwt(data?.session?.access_token || null);
      } else {
        setJwt(null);
      }
    };
    getToken();
  }, [isAuthenticated]);

  // Carga todas las conexiones y la activa
  const loadConnections = useCallback(async () => {
    if (!jwt) return;
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const connections = await databaseApi.getConnections(jwt);
      const activeConnection = connections.find((conn: any) => conn.isActive) || null;

      setState(prev => ({
        ...prev,
        connections,
        activeConnection,
        isConnected: !!activeConnection,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [jwt]);

  useEffect(() => {
    if (jwt) loadConnections();
  }, [jwt, loadConnections]);

  // Prueba de conexión
  const testConnection = useCallback(async (
    connectionData: Omit<DatabaseConnection, 'id' | 'created_at'> & { password: string }
  ): Promise<boolean> => {
    if (!jwt) return false;
    try {
      await databaseApi.testConnection(connectionData, jwt);
      toast({
        title: "¡Conexión exitosa!",
        description: "La prueba de conexión a la base de datos fue exitosa",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Conexión fallida",
        description: error.message || "No se pudo conectar a la base de datos",
        variant: "destructive",
      });
      return false;
    }
  }, [jwt, toast]);

  // Guardar conexión (NO la activa, solo guarda)
  const connect = useCallback(async (
    connectionData: Omit<DatabaseConnection, 'id' | 'created_at'> & { password: string }
  ): Promise<boolean> => {
    if (!jwt) return false;
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await databaseApi.createConnection(connectionData, jwt);

      toast({
        title: "Conexión guardada",
        description: `Parámetros guardados para ${response.database}`,
      });

      loadConnections();

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo guardar la conexión",
        variant: "destructive",
      });
      return false;
    }
  }, [jwt, toast, loadConnections]);

  // Activar conexión ya guardada
  const activateConnection = useCallback(async (connectionId: string) => {
    if (!jwt) return;
    try {
      await databaseApi.activateConnection(connectionId, jwt);
      toast({
        title: "¡Conectado!",
        description: "Conexión activada correctamente.",
      });
      loadConnections();
    } catch (error: any) {
      toast({
        title: "Error al conectar",
        description: error.message || "No se pudo activar la conexión",
        variant: "destructive",
      });
    }
  }, [jwt, toast, loadConnections]);

  // Desactivar conexión activa
  const deactivateConnection = useCallback(async () => {
    if (!jwt) return;
    try {
      await databaseApi.deactivateConnection(jwt);
      toast({
        title: "Desconectado",
        description: "La conexión ha sido desactivada.",
      });
      loadConnections();
    } catch (error: any) {
      toast({
        title: "Error al desconectar",
        description: error.message || "No se pudo desconectar",
        variant: "destructive",
      });
    }
  }, [jwt, toast, loadConnections]);

  // Eliminar una conexión guardada
  const removeConnection = useCallback(async (connectionId: string) => {
    if (!jwt) return;
    try {
      await databaseApi.deleteConnection(connectionId, jwt);
      toast({
        title: "Conexión eliminada",
        description: "La conexión fue eliminada correctamente.",
      });
      loadConnections();
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la conexión",
        variant: "destructive",
      });
    }
  }, [jwt, toast, loadConnections]);

  return {
    ...state,
    testConnection,
    connect,
    activateConnection,
    deactivateConnection,
    removeConnection,
    refreshConnections: loadConnections,
  };
}
