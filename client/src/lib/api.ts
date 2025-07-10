import { apiRequest } from "./queryClient";

// Tipos
export interface DatabaseConnection {
  id: string;
  name: string;
  db_type: string;
  database: string;
  host: string;
  port: number;
  username: string;
  isActive?: boolean;
  data_dictionary?: any;
  dictionary_table?: string;
  created_at?: string;
}

export interface Query {
  id: number;
  naturalLanguageQuery: string;
  response: string;
  sqlQuery?: string;
  isSuccessful: boolean;
  executionTime?: number;
  createdAt: string;
  table?: string;
}

export interface QueryResponse {
  answer: string;
  sql_query?: string;
  queryId?: number;
  executionTime?: number;
}

// ---------------------
// Database API
// ---------------------
export const databaseApi = {
  testConnection: async (connectionData: any) => {
    const response = await apiRequest("POST", "/connections/test", connectionData);
    return response.json();
  },

  createConnection: async (connectionData: any) => {
    const response = await apiRequest("POST", "/connections/", connectionData);
    return response.json();
  },

  getConnections: async (): Promise<DatabaseConnection[]> => {
    const response = await apiRequest("GET", "/connections/");
    return response.json();
  },

  activateConnection: async (connectionId: string) => {
    const response = await apiRequest("POST", `/connections/${connectionId}/activate`, {});
    return response.json();
  },

  deactivateConnection: async () => {
    const response = await apiRequest("POST", "/connections/deactivate", {});
    return response.json();
  },

  deleteConnection: async (connectionId: string) => {
    const response = await apiRequest("DELETE", `/connections/${connectionId}`);
    return response.json();
  },

  getTableNames: async (): Promise<string[]> => {
    const response = await apiRequest("GET", "/connections/tables");
    return response.json();
  },

  getTablesFromParams: async (params: any): Promise<string[]> => {
    const response = await apiRequest("POST", "/connections/get-tables", params);
    return response.json();
  },

  askLLMQuestion: async (question: string, table: string): Promise<QueryResponse> => {
    const response = await apiRequest("POST", "/query", { question, table });
    return response.json();
  },

  getQueryHistory: async (limit = 20): Promise<{ queries: Query[] }> => {
    const response = await apiRequest("GET", `/api/queries/history?limit=${limit}`);
    return response.json();
  },
};

// ---------------------
// Feedback API
// ---------------------
export const feedbackApi = {
  submit: async (feedbackData: {
    queryId: number;
    rating: number;
    comment?: string;
  }): Promise<{ message: string; feedbackId: number }> => {
    const response = await apiRequest("POST", "/api/feedback", feedbackData);
    return response.json();
  },
};

// ---------------------
// User API (Opcional)
// ---------------------
export const userApi = {
  updateProfile: async (profileData: any) => {
    const response = await apiRequest("PUT", "/api/user/profile", profileData);
    return response.json();
  },
  changePassword: async (passwordData: any) => {
    const response = await apiRequest("PUT", "/api/user/password", passwordData);
    return response.json();
  },
};
