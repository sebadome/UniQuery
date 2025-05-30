import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { loginSchema, registerSchema, dbConnectionSchema, insertQuerySchema, insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username) || 
                          await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by username or email
      const user = await storage.getUserByUsername(validatedData.username) || 
                   await storage.getUserByEmail(validatedData.username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // In a real implementation, you might blacklist the token
    // No authentication required for logout - just clear client-side session
    res.json({ message: "Logout successful" });
  });

  // Database connection routes
  app.post("/api/database/test-connection", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = dbConnectionSchema.parse(req.body);
      
      // For demo purposes, accept any connection with the expected test parameters
      // In a real implementation, you would test the actual database connection here
      const isValidTestConnection = (
        validatedData.type === 'postgresql' &&
        validatedData.host === 'localhost' &&
        validatedData.port === 5432 &&
        validatedData.database === 'test_db' &&
        validatedData.username === 'test_user' &&
        validatedData.password === 'test_password'
      );
      
      if (!isValidTestConnection) {
        return res.status(400).json({ 
          message: "Conexión fallida", 
          error: "No se pudo conectar a la base de datos. Por favor verifica tus credenciales y conectividad de red." 
        });
      }

      res.json({ message: "Conexión exitosa" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validación fallida", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/database/connect", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = dbConnectionSchema.parse(req.body);
      
      // Remove password from data to store (we don't persist passwords)
      const { password, ...connectionData } = validatedData;
      
      // Deactivate other connections
      const userConnections = await storage.getUserConnections(req.userId);
      for (const conn of userConnections) {
        await storage.updateConnection(conn.id, req.userId, { isActive: false });
      }
      
      // Create new connection
      const connection = await storage.createConnection({
        ...connectionData,
        userId: req.userId,
        isActive: true,
      });

      res.json({
        message: "Database connected successfully",
        connection: {
          id: connection.id,
          name: connection.name,
          type: connection.type,
          database: connection.database,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/database/disconnect", authenticateToken, async (req: any, res) => {
    try {
      const { connectionId } = req.body;
      
      if (!connectionId) {
        return res.status(400).json({ message: "Connection ID is required" });
      }
      
      // Directly update the connection to inactive
      await storage.updateConnection(connectionId, req.userId, { isActive: false });

      res.json({ message: "Base de datos desconectada exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/database/connections", authenticateToken, async (req: any, res) => {
    try {
      const connections = await storage.getUserConnections(req.userId);
      
      res.json({
        connections: connections.map(conn => ({
          id: conn.id,
          name: conn.name,
          type: conn.type,
          database: conn.database,
          isActive: conn.isActive,
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Query routes
  app.post("/api/queries/human-query", authenticateToken, async (req: any, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      // Get user's active connection
      const connections = await storage.getUserConnections(req.userId);
      const activeConnection = connections.find(conn => conn.isActive);
      
      if (!activeConnection) {
        return res.status(400).json({ message: "No active database connection" });
      }

      // In a real implementation, you would:
      // 1. Send the query to your AI service to convert to SQL
      // 2. Execute the SQL against the connected database
      // 3. Format the response in natural language
      
      // For now, we'll simulate this process
      const mockSqlQuery = `SELECT * FROM ${query.includes('user') ? 'users' : 'products'} LIMIT 10;`;
      const mockResponse = `I found several records matching your query "${query}". The results show relevant data from your ${activeConnection.database} database.`;
      
      // Save query to history
      const savedQuery = await storage.createQuery({
        userId: req.userId,
        connectionId: activeConnection.id,
        naturalLanguageQuery: query,
        sqlQuery: mockSqlQuery,
        response: mockResponse,
        isSuccessful: true,
        executionTime: Math.floor(Math.random() * 1000) + 100, // Random execution time
      });

      res.json({
        query: savedQuery.naturalLanguageQuery,
        response: savedQuery.response,
        sqlQuery: savedQuery.sqlQuery,
        queryId: savedQuery.id,
        executionTime: savedQuery.executionTime,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/queries/history", authenticateToken, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const queries = await storage.getUserQueries(req.userId, limit);
      
      res.json({
        queries: queries.map(query => ({
          id: query.id,
          naturalLanguageQuery: query.naturalLanguageQuery,
          response: query.response,
          sqlQuery: query.sqlQuery,
          isSuccessful: query.isSuccessful,
          executionTime: query.executionTime,
          createdAt: query.createdAt,
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Feedback routes
  app.post("/api/feedback", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertFeedbackSchema.parse(req.body);
      
      const feedback = await storage.createFeedback({
        ...validatedData,
        userId: req.userId,
      });

      res.json({
        message: "Feedback submitted successfully",
        feedbackId: feedback.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User profile routes
  app.put("/api/user/profile", authenticateToken, async (req: any, res) => {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const updatedUser = await storage.updateUser(req.userId, { name, email });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          name: updatedUser.name,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/user/password", authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      const user = await storage.getUser(req.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await storage.updateUser(req.userId, { password: hashedPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
