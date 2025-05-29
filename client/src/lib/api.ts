import { apiRequest } from "./queryClient";

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
  };
  message: string;
}

export interface DatabaseConnection {
  id: number;
  name: string;
  type: string;
  database: string;
  isActive: boolean;
}

export interface Query {
  id: number;
  naturalLanguageQuery: string;
  response: string;
  sqlQuery?: string;
  isSuccessful: boolean;
  executionTime?: number;
  createdAt: string;
}

export interface QueryResponse {
  query: string;
  response: string;
  sqlQuery?: string;
  queryId: number;
  executionTime?: number;
}

// Auth API
export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await apiRequest('POST', '/api/auth/login', { username, password });
    return response.json();
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
  }): Promise<AuthResponse> => {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    return response.json();
  },

  me: async (): Promise<{ user: AuthResponse['user'] }> => {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiRequest('POST', '/api/auth/logout');
    return response.json();
  },
};

// Database API
export const databaseApi = {
  testConnection: async (connectionData: {
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    name: string;
  }): Promise<{ message: string }> => {
    const response = await apiRequest('POST', '/api/database/test-connection', connectionData);
    return response.json();
  },

  connect: async (connectionData: {
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    name: string;
  }): Promise<{ message: string; connection: DatabaseConnection }> => {
    const response = await apiRequest('POST', '/api/database/connect', connectionData);
    return response.json();
  },

  getConnections: async (): Promise<{ connections: DatabaseConnection[] }> => {
    const response = await apiRequest('GET', '/api/database/connections');
    return response.json();
  },
};

// Query API
export const queryApi = {
  sendQuery: async (query: string): Promise<QueryResponse> => {
    const response = await apiRequest('POST', '/api/queries/human-query', { query });
    return response.json();
  },

  getHistory: async (limit = 20): Promise<{ queries: Query[] }> => {
    const response = await apiRequest('GET', `/api/queries/history?limit=${limit}`);
    return response.json();
  },
};

// Feedback API
export const feedbackApi = {
  submit: async (feedbackData: {
    queryId: number;
    rating: number;
    comment?: string;
  }): Promise<{ message: string; feedbackId: number }> => {
    const response = await apiRequest('POST', '/api/feedback', feedbackData);
    return response.json();
  },
};

// User API
export const userApi = {
  updateProfile: async (profileData: {
    name: string;
    email: string;
  }): Promise<{ message: string; user: AuthResponse['user'] }> => {
    const response = await apiRequest('PUT', '/api/user/profile', profileData);
    return response.json();
  },

  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const response = await apiRequest('PUT', '/api/user/password', passwordData);
    return response.json();
  },
};
