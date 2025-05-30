import React, { createContext, useContext, useState, useEffect } from 'react';
import { databaseApi, type DatabaseConnection } from '@/lib/api';

interface DatabaseContextType {
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;
  isConnected: boolean;
  isLoading: boolean;
  refreshConnections: () => Promise<void>;
  setActiveConnection: (connection: DatabaseConnection | null) => void;
  setIsConnected: (connected: boolean) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshConnections = async () => {
    try {
      setIsLoading(true);
      const response = await databaseApi.getConnections();
      const active = response.connections.find(conn => conn.isActive) || null;
      
      setConnections(response.connections);
      setActiveConnection(active);
      setIsConnected(!!active);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshConnections();
    
    // Listen for disconnect events
    const handleDisconnect = () => {
      refreshConnections();
    };
    
    window.addEventListener('database-disconnected', handleDisconnect);
    
    return () => {
      window.removeEventListener('database-disconnected', handleDisconnect);
    };
  }, []);

  const value = {
    connections,
    activeConnection,
    isConnected,
    isLoading,
    refreshConnections,
    setActiveConnection,
    setIsConnected,
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