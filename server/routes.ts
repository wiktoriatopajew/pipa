import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, insertChatSessionSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password required")
});

const subscriptionRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format")
});

// Utility function to sanitize user objects
const toPublicUser = (user: any) => {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
};

// Rate limiting configurations
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Extend Express Request type to include session and user data
declare module 'express-serve-static-core' {
  interface Request {
    session: any;
    user?: any;
    subscription?: any;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin Authentication
  app.post("/api/admin/login", authRateLimit, async (req, res) => {
    try {
      // Validate request body
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid login data", 
          details: result.error.issues 
        });
      }
      
      const { email, password } = result.data;

      const user = await storage.verifyPassword(email, password);
      
      if (!user || !user.isAdmin) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      // Update online status
      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });

      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Session regeneration failed" });
        }
        
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
      const sanitizedUsers = users.filter(u => !u.isAdmin).map(toPublicUser);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      res.json(toPublicUser(user));
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

  // User middleware to check authentication and subscription
  const requireUser = async (req: Request, res: Response, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Check if user has active subscription
    const subscriptions = await storage.getUserSubscriptions(user.id);
    const activeSubscription = subscriptions.find(sub => 
      sub.status === "active" && 
      sub.expiresAt && 
      new Date(sub.expiresAt) > new Date()
    );
    
    if (!activeSubscription) {
      return res.status(403).json({ error: "Active subscription required" });
    }
    
    req.user = user;
    req.subscription = activeSubscription;
    next();
  };

  // User Authentication endpoints
  app.post("/api/users/register", authRateLimit, async (req, res) => {
    try {
      // Validate request body
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid user data", 
          details: result.error.issues 
        });
      }
      
      const { username, email, password } = result.data;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email || "");
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser({ username, email, password });
      
      // Regenerate session to prevent session fixation and auto-login
      req.session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Session regeneration failed" });
        }
        
        req.session.userId = user.id;
        req.session.isUser = true;
        
        res.json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          hasSubscription: user.hasSubscription 
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/users/login", authRateLimit, async (req, res) => {
    try {
      // Validate request body
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid login data", 
          details: result.error.issues 
        });
      }
      
      const { email, password } = result.data;

      const user = await storage.verifyPassword(email, password);
      
      if (!user || user.isAdmin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update online status
      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });

      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Session regeneration failed" });
        }
        
        // Store user session
        req.session.userId = user.id;
        req.session.isUser = true;

        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            username: user.username,
            hasSubscription: user.hasSubscription
          } 
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users/logout", async (req, res) => {
    if (req.session.userId) {
      await storage.updateUser(req.session.userId, { isOnline: false });
    }
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/users/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check subscription status
      const subscriptions = await storage.getUserSubscriptions(user.id);
      const activeSubscription = subscriptions.find(sub => 
        sub.status === "active" && 
        sub.expiresAt && 
        new Date(sub.expiresAt) > new Date()
      );

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        hasSubscription: !!activeSubscription,
        subscription: activeSubscription || null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Validate request body
      const result = subscriptionRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid subscription data", 
          details: result.error.issues 
        });
      }
      
      const { amount } = result.data;
      
      // Set expiry date to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const subscription = await storage.createSubscription({
        userId: req.session.userId, // Use userId from session, not client input
        amount: amount.toString(),
        status: "active",
        expiresAt
      });
      
      // Update user hasSubscription flag
      await storage.updateUser(req.session.userId, { hasSubscription: true });
      
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Protected Chat Endpoints for Users (require authentication and subscription)
  app.post("/api/chat/sessions", requireUser, async (req, res) => {
    try {
      const { vehicleInfo } = req.body;
      
      const session = await storage.createChatSession({
        userId: req.user.id, // Use authenticated user ID from session
        vehicleInfo: JSON.stringify(vehicleInfo || {}),
        status: "active"
      });
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/sessions/:sessionId/messages", requireUser, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied to this chat session" });
      }
      
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

  app.post("/api/chat/sessions/:sessionId/messages", requireUser, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content required" });
      }
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied to this chat session" });
      }
      
      const message = await storage.createMessage({
        sessionId,
        senderId: req.user.id, // Use authenticated user ID from session
        senderType: "user", // Always "user" for authenticated user messages
        content,
        isRead: false
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // User heartbeat for online status (protected)
  app.post("/api/users/heartbeat", requireUser, async (req, res) => {
    try {
      const updatedUser = await storage.updateUser(req.user.id, { 
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
