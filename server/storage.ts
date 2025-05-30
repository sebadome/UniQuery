import { users, databaseConnections, queries, feedback, type User, type InsertUser, type DatabaseConnection, type InsertDatabaseConnection, type Query, type InsertQuery, type Feedback, type InsertFeedback } from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Database connections
  getUserConnections(userId: number): Promise<DatabaseConnection[]>;
  getConnection(id: number, userId: number): Promise<DatabaseConnection | undefined>;
  createConnection(connection: InsertDatabaseConnection & { userId: number }): Promise<DatabaseConnection>;
  updateConnection(id: number, userId: number, connection: Partial<InsertDatabaseConnection>): Promise<DatabaseConnection | undefined>;
  deleteConnection(id: number, userId: number): Promise<boolean>;
  
  // Query history
  getUserQueries(userId: number, limit?: number): Promise<Query[]>;
  createQuery(query: InsertQuery & { userId: number }): Promise<Query>;
  
  // Feedback
  createFeedback(feedback: InsertFeedback & { userId: number }): Promise<Feedback>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private connections: Map<number, DatabaseConnection>;
  private queries: Map<number, Query>;
  private feedbacks: Map<number, Feedback>;
  private currentUserId: number;
  private currentConnectionId: number;
  private currentQueryId: number;
  private currentFeedbackId: number;

  constructor() {
    this.users = new Map();
    this.connections = new Map();
    this.queries = new Map();
    this.feedbacks = new Map();
    this.currentUserId = 1;
    this.currentConnectionId = 1;
    this.currentQueryId = 1;
    this.currentFeedbackId = 1;
    
    // Create a test user for development
    this.createTestUser();
  }
  
  private async createTestUser() {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUser: User = {
      id: 1,
      username: 'admin',
      email: 'admin@unifrutti.com',
      name: 'Administrador UniQuery',
      password: hashedPassword,
      createdAt: new Date()
    };
    
    this.users.set(1, testUser);
    this.currentUserId = 2;
    
    // Create a test database connection for demo purposes
    const testConnection: DatabaseConnection = {
      id: 1,
      name: 'Conexión de Prueba',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      username: 'test_user',
      database: 'test_db',
      userId: 1,
      isActive: true,
      createdAt: new Date()
    };
    
    this.connections.set(1, testConnection);
    this.currentConnectionId = 2;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUserConnections(userId: number): Promise<DatabaseConnection[]> {
    return Array.from(this.connections.values()).filter(
      (connection) => connection.userId === userId,
    );
  }

  async getConnection(id: number, userId: number): Promise<DatabaseConnection | undefined> {
    const connection = this.connections.get(id);
    return connection && connection.userId === userId ? connection : undefined;
  }

  async createConnection(connectionData: InsertDatabaseConnection & { userId: number }): Promise<DatabaseConnection> {
    const id = this.currentConnectionId++;
    const connection: DatabaseConnection = {
      ...connectionData,
      id,
      createdAt: new Date(),
      isActive: connectionData.isActive ?? false
    };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnection(id: number, userId: number, updateData: Partial<InsertDatabaseConnection>): Promise<DatabaseConnection | undefined> {
    const connection = this.connections.get(id);
    if (!connection || connection.userId !== userId) return undefined;
    
    // Create updated connection with explicit type handling
    const updatedConnection: DatabaseConnection = { 
      id: connection.id,
      createdAt: connection.createdAt,
      userId: connection.userId,
      name: updateData.name ?? connection.name,
      type: updateData.type ?? connection.type,
      host: updateData.host ?? connection.host,
      port: updateData.port ?? connection.port,
      database: updateData.database ?? connection.database,
      username: updateData.username ?? connection.username,
      password: updateData.password ?? connection.password,
      isActive: updateData.isActive ?? connection.isActive
    };
    
    this.connections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteConnection(id: number, userId: number): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection || connection.userId !== userId) return false;
    
    this.connections.delete(id);
    return true;
  }

  async getUserQueries(userId: number, limit = 50): Promise<Query[]> {
    const userQueries = Array.from(this.queries.values())
      .filter((query) => query.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return userQueries.slice(0, limit);
  }

  async createQuery(queryData: InsertQuery & { userId: number }): Promise<Query> {
    const id = this.currentQueryId++;
    const query: Query = {
      ...queryData,
      id,
      createdAt: new Date()
    };
    this.queries.set(id, query);
    return query;
  }

  async createFeedback(feedbackData: InsertFeedback & { userId: number }): Promise<Feedback> {
    const id = this.currentFeedbackId++;
    const feedback: Feedback = {
      ...feedbackData,
      id,
      createdAt: new Date()
    };
    this.feedbacks.set(id, feedback);
    return feedback;
  }
}

export const storage = new MemStorage();
