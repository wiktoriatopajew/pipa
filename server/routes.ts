import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

// Extend Express Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin Authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.verifyPassword(email, password);
      
      if (!user || !user.isAdmin) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      // Update online status
      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });

      // Store admin session
      req.session.adminId = user.id;
      req.session.isAdmin = true;

      res.json({ 
        success: true, 
        admin: { 
          id: user.id, 
          email: user.email, 
          username: user.username 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    if (req.session.adminId) {
      await storage.updateUser(req.session.adminId, { isOnline: false });
    }
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Admin middleware
  const requireAdmin = (req: Request, res: Response, next: any) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Admin Dashboard Data
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const subscriptions = await storage.getAllActiveSubscriptions();
      const activeSessions = await storage.getAllActiveChatSessions();
      const unreadMessages = await storage.getAllUnreadMessages();
      const recentMessages = await storage.getRecentMessages(20);

      const stats = {
        totalUsers: users.length,
        subscribedUsers: users.filter(u => u.hasSubscription).length,
        onlineUsers: users.filter(u => u.isOnline).length,
        activeChats: activeSessions.length,
        unreadMessages: unreadMessages.length,
        totalRevenue: subscriptions.reduce((sum, sub) => sum + parseFloat(sub.amount || "0"), 0)
      };

      res.json({
        stats,
        users: users.filter(u => !u.isAdmin), // Don't show admin user
        subscriptions,
        activeSessions,
        unreadMessages,
        recentMessages
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // User Management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.filter(u => !u.isAdmin));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Subscription Management
  app.post("/api/admin/subscriptions", requireAdmin, async (req, res) => {
    try {
      const result = insertSubscriptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      const subscription = await storage.createSubscription(result.data);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Chat Management
  app.get("/api/admin/chats", requireAdmin, async (req, res) => {
    try {
      const sessions = await storage.getAllActiveChatSessions();
      
      // Enrich with user data and recent messages
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          const user = session.userId ? await storage.getUser(session.userId) : null;
          const messages = await storage.getSessionMessages(session.id);
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(m => !m.isRead && m.senderType === 'user').length;
          
          return {
            ...session,
            user,
            lastMessage,
            unreadCount,
            messageCount: messages.length
          };
        })
      );

      res.json(enrichedSessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/admin/chats/:sessionId/messages", requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getSessionMessages(sessionId);
      
      // Enrich with sender data
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = message.senderId ? await storage.getUser(message.senderId) : null;
          return {
            ...message,
            sender
          };
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/chats/:sessionId/messages", requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Message content required" });
      }

      const messageData = {
        sessionId,
        senderId: req.session.adminId,
        senderType: "admin",
        content,
        isRead: true
      };

      const result = insertMessageSchema.safeParse(messageData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid message data" });
      }

      const message = await storage.createMessage(result.data);
      const sender = await storage.getUser(req.session.adminId);

      res.json({
        ...message,
        sender
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/admin/messages/:messageId/read", requireAdmin, async (req, res) => {
    try {
      const { messageId } = req.params;
      await storage.markMessageAsRead(messageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // Real-time data endpoint
  app.get("/api/admin/live-data", requireAdmin, async (req, res) => {
    try {
      const unreadMessages = await storage.getAllUnreadMessages();
      const activeSessions = await storage.getAllActiveChatSessions();
      const onlineUsers = (await storage.getAllUsers()).filter(u => u.isOnline && !u.isAdmin);

      res.json({
        unreadCount: unreadMessages.length,
        activeChatsCount: activeSessions.length,
        onlineUsersCount: onlineUsers.length,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch live data" });
    }
  });

  // Public endpoints for client app
  app.post("/api/users/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email || "");
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser({ username, email, password });
      res.json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      const subscription = await storage.createSubscription({
        userId,
        amount: amount.toString(),
        status: "active"
      });
      
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Public Chat Endpoints for Users
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const { userId, vehicleType, issue } = req.body;
      
      const session = await storage.createChatSession({
        userId,
        vehicleType: vehicleType || "Car",
        issue: issue || "General inquiry",
        status: "active"
      });
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.post("/api/chat/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId, content, sender } = req.body;
      
      if (!content || !sender) {
        return res.status(400).json({ error: "Content and sender required" });
      }
      
      const message = await storage.createMessage({
        sessionId,
        userId: userId || null,
        content,
        sender,
        isRead: false
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // User heartbeat for online status
  app.post("/api/users/heartbeat", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        isOnline: true, 
        lastSeen: new Date() 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update heartbeat" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
