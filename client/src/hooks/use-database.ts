import { useState, useEffect } from 'react';
import { databaseApi, type DatabaseConnection } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await databaseApi.getConnections();
      
      const activeConnection = response.connections.find(conn => conn.isActive) || null;
      
      setState(prev => ({
        ...prev,
        connections: response.connections,
        activeConnection,
        isConnected: !!activeConnection,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const testConnection = async (connectionData: {
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    name: string;
  }): Promise<boolean> => {
    try {
      await databaseApi.testConnection(connectionData);
      
      toast({
        title: "Connection successful!",
        description: "Database connection test passed",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Unable to connect to database",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const connect = async (connectionData: {
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    name: string;
  }): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await databaseApi.connect(connectionData);
      
      // Immediately update state with the connection
      const newConnection = { ...response.connection, isActive: true };
      setState(prev => ({
        ...prev,
        connections: [...prev.connections.filter(c => c.id !== newConnection.id), newConnection],
        activeConnection: newConnection,
        isConnected: true,
        isLoading: false,
      }));

      toast({
        title: "Base de datos conectada!",
        description: `Conectado a ${response.connection.database}`,
      });

      // Force re-render by reloading connections after a short delay
      setTimeout(() => {
        loadConnections();
      }, 500);
      
      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to database",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const disconnect = async (connectionId: number): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await databaseApi.disconnect(connectionId);
      
      // Update connections list immediately by setting isActive to false
      setState(prev => ({
        ...prev,
        connections: prev.connections.map(conn => 
          conn.id === connectionId ? { ...conn, isActive: false } : conn
        ),
        activeConnection: null,
        isConnected: false,
        isLoading: false,
      }));

      toast({
        title: "Base de datos desconectada",
        description: "La conexión se ha desconectado exitosamente",
      });

      // Trigger a global refresh to update all components
      window.dispatchEvent(new CustomEvent('database-disconnected'));
      
      return true;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error al desconectar",
        description: error.message || "No se pudo desconectar la base de datos",
        variant: "destructive",
      });
      
      return false;
    }
  };

  return {
    ...state,
    testConnection,
    connect,
    disconnect,
    refreshConnections: loadConnections,
  };
}
