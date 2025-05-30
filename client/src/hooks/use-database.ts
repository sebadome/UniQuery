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
      
      setState(prev => ({
        ...prev,
        activeConnection: response.connection,
        isConnected: true,
        isLoading: false,
      }));

      toast({
        title: "Base de datos conectada!",
        description: `Conectado a ${response.connection.database}`,
      });

      // Force reload connections to update sidebar state
      setTimeout(async () => {
        await loadConnections();
      }, 100);
      
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

  return {
    ...state,
    testConnection,
    connect,
    refreshConnections: loadConnections,
  };
}
