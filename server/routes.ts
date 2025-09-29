import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, insertChatSessionSchema, insertMessageSchema, insertUserSchema, insertAttachmentSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendUserLoginNotification, sendFirstMessageNotification, sendSubsequentMessageNotification } from "./email";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password required")
});

const subscriptionRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format")
});

// File upload configuration
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage: storage_multer,
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB max
  },
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
  // PayPal routes - reference: blueprint:javascript_paypal
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

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
        users: users.filter(u => !u.isAdmin).map(toPublicUser), // Sanitize user data
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
            user: toPublicUser(user),
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
      
      // Enrich with sender data and attachments (sanitized)
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = message.senderId ? await storage.getUser(message.senderId) : null;
          const attachments = await storage.getMessageAttachments(message.id);
          
          return {
            ...message,
            sender: toPublicUser(sender),
            attachments: attachments
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

  // Auth middleware to check authentication only (for subscription creation)
  const requireAuth = async (req: Request, res: Response, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    req.user = user;
    next();
  };

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
      const now = new Date();
      const activeSubscription = subscriptions.find(sub => 
        sub.status === "active" && 
        sub.expiresAt && 
        new Date(sub.expiresAt) > now
      );

      // Calculate days remaining
      let subscriptionDaysLeft = 0;
      if (activeSubscription?.expiresAt) {
        const expiresAt = new Date(activeSubscription.expiresAt);
        const diffMs = expiresAt.getTime() - now.getTime();
        subscriptionDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        hasSubscription: !!activeSubscription,
        subscription: activeSubscription || null,
        subscriptionDaysLeft
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  app.post("/api/subscriptions", requireAuth, async (req, res) => {
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

  // Get user's chat sessions
  app.get("/api/chat/sessions", requireUser, async (req, res) => {
    try {
      const sessions = await storage.getUserChatSessions(req.user.id);

      // Get preview message and computed data for each session
      const sessionsWithPreviews = await Promise.all(
        sessions.map(async (session) => {
          const messages = await storage.getSessionMessages(session.id);
          const lastMessage = messages[messages.length - 1];
          
          // Compute the actual last activity time with safe timestamp conversions
          const sessionLastActivity = session.lastActivity ? new Date(session.lastActivity).getTime() : 0;
          const sessionCreated = session.createdAt ? new Date(session.createdAt).getTime() : 0;
          const messageCreated = lastMessage?.createdAt ? new Date(lastMessage.createdAt).getTime() : 0;
          
          const computedLastActivity = new Date(Math.max(sessionLastActivity, messageCreated, sessionCreated) || Date.now());

          // Count unread messages from non-user senders
          const unreadCount = messages.filter(msg => 
            !msg.isRead && msg.senderType !== 'user'
          ).length;
          
          return {
            ...session,
            lastActivity: computedLastActivity,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderType: lastMessage.senderType
            } : null,
            messageCount: messages.length,
            unreadCount
          };
        })
      );

      // Sort by computed last activity (most recent first)
      const sortedSessions = sessionsWithPreviews.sort((a, b) => {
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });
      
      res.json(sortedSessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
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
      
      // Enrich with sender data (sanitized)
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = message.senderId ? await storage.getUser(message.senderId) : null;
          return {
            ...message,
            sender: toPublicUser(sender)
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
      
      // Check if this is the first user message in this session
      const existingMessages = await storage.getSessionMessages(sessionId);
      const userMessages = existingMessages.filter(msg => msg.senderType === "user");
      const isFirstMessage = userMessages.length === 0;
      
      const message = await storage.createMessage({
        sessionId,
        senderId: req.user.id, // Use authenticated user ID from session
        senderType: "user", // Always "user" for authenticated user messages
        content,
        isRead: false
      });
      
      // Send email notifications if this is the first message
      if (isFirstMessage) {
        try {
          const emailData = {
            userEmail: req.user.email || 'unknown@email.com',
            userName: req.user.username,
            messageContent: content,
            sessionId: sessionId,
            isFirstMessage: true
          };
          
          // Send first message notification
          await sendFirstMessageNotification(emailData);
          
          // Schedule follow-up email after 5 minutes
          scheduleFollowUpEmail(emailData);
          
          console.log('Email notifications sent for first message from user:', req.user.username);
        } catch (emailError) {
          // Log error but don't fail the message creation
          console.error('Failed to send email notifications:', emailError);
        }
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get messages for chat session (user endpoint)
  app.get("/api/chat/sessions/:sessionId/messages", requireUser, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied to this chat session" });
      }
      
      const messages = await storage.getSessionMessages(sessionId);
      
      // Enrich with sender data and attachments
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = message.senderId ? await storage.getUser(message.senderId) : null;
          const attachments = await storage.getMessageAttachments(message.id);
          
          return {
            ...message,
            sender: toPublicUser(sender),
            attachments: attachments
          };
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Upload file for chat message
  app.post("/api/chat/sessions/:sessionId/upload", requireUser, upload.single('file'), async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied to this chat session" });
      }
      
      // Check file size limits based on type
      const isImage = req.file.mimetype.startsWith('image/');
      const isVideo = req.file.mimetype.startsWith('video/');
      const maxSize = isImage ? 30 * 1024 * 1024 : 150 * 1024 * 1024; // 30MB for images, 150MB for videos
      
      if (req.file.size > maxSize) {
        // Delete uploaded file if size exceeded
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: `File too large. Maximum size is ${isImage ? '30MB' : '150MB'} for ${isImage ? 'images' : 'videos'}` 
        });
      }
      
      // Create message with file content indicator
      const message = await storage.createMessage({
        sessionId,
        senderId: req.user.id,
        senderType: "user",
        content: `[File: ${req.file.originalname}]`,
        isRead: false
      });
      
      // Create attachment record
      const attachment = await storage.createAttachment({
        messageId: message.id,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
      });
      
      res.json({ message, attachment });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Serve uploaded files
  app.get("/api/uploads/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join('uploads', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Get attachment info to verify access
      const attachment = await storage.getAttachmentByFilename(filename);
      if (!attachment) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Check if file has expired
      if (attachment.expiresAt && new Date() > attachment.expiresAt) {
        // Delete expired file
        fs.unlinkSync(filePath);
        await storage.deleteAttachment(attachment.id);
        return res.status(404).json({ error: "File has expired" });
      }
      
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      res.status(500).json({ error: "Failed to serve file" });
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
