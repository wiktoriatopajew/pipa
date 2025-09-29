import { 
  type User, type InsertUser,
  type Subscription, type InsertSubscription,
  type ChatSession, type InsertChatSession,
  type Message, type InsertMessage,
  type Attachment, type InsertAttachment,
  users, subscriptions, chatSessions, messages, attachments
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, and, desc, lt } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  
  // Subscription methods
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  getAllActiveSubscriptions(): Promise<Subscription[]>;
  
  // Chat session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getUserChatSessions(userId: string): Promise<ChatSession[]>;
  getAllActiveChatSessions(): Promise<ChatSession[]>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getSessionMessages(sessionId: string): Promise<Message[]>;
  getAllUnreadMessages(): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<void>;
  getRecentMessages(limit?: number): Promise<Message[]>;
  
  // Attachment methods
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getMessageAttachments(messageId: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  getAttachmentByFilename(filename: string): Promise<Attachment | undefined>;
  deleteAttachment(id: string): Promise<void>;
  getExpiredAttachments(): Promise<Attachment[]>;
  deleteExpiredAttachments(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private subscriptions: Map<string, Subscription>;
  private chatSessions: Map<string, ChatSession>;
  private messages: Map<string, Message>;
  private attachments: Map<string, Attachment>;

  constructor() {
    this.users = new Map();
    this.subscriptions = new Map();
    this.chatSessions = new Map();
    this.messages = new Map();
    this.attachments = new Map();
  }

  async initAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminEmail && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      const adminUser: User = {
        id: randomUUID(),
        username: "admin",
        password: hashedPassword,
        email: adminEmail,
        isAdmin: true,
        hasSubscription: true,
        isOnline: false,
        lastSeen: new Date(),
        createdAt: new Date(),
      };
      this.users.set(adminUser.id, adminUser);
      console.log(`Admin user created with email: ${adminEmail}`);
    } else {
      console.log("No admin credentials provided - admin user not created");
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
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
    const id = randomUUID();
    
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    
    const user: User = { 
      ...insertUser,
      password: hashedPassword,
      email: insertUser.email || null,
      id,
      isAdmin: false,
      hasSubscription: false,
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Subscription methods
  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      status: insertSubscription.status || "active",
      userId: insertSubscription.userId || null,
      amount: insertSubscription.amount || null,
      purchasedAt: new Date(),
      expiresAt: insertSubscription.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
    this.subscriptions.set(id, subscription);
    
    // Update user subscription status
    if (insertSubscription.userId) {
      await this.updateUser(insertSubscription.userId, { hasSubscription: true });
    }
    
    return subscription;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.userId === userId,
    );
  }

  async getAllActiveSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.status === "active",
    );
  }

  // Chat session methods
  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      ...insertSession,
      id,
      status: insertSession.status || "active",
      userId: insertSession.userId || null,
      vehicleInfo: insertSession.vehicleInfo || null,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(
      (session) => session.userId === userId,
    );
  }

  async getAllActiveChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(
      (session) => session.status === "active",
    );
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, lastActivity: new Date() };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      sessionId: insertMessage.sessionId || null,
      senderId: insertMessage.senderId || null,
      senderType: insertMessage.senderType || null,
      isRead: insertMessage.isRead || false,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    
    // Update session last activity
    if (insertMessage.sessionId) {
      await this.updateChatSession(insertMessage.sessionId, {});
    }
    
    return message;
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.sessionId === sessionId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async getAllUnreadMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (msg) => !msg.isRead && msg.senderType === "user",
    );
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      this.messages.set(messageId, { ...message, isRead: true });
    }
  }

  async getRecentMessages(limit: number = 50): Promise<Message[]> {
    return Array.from(this.messages.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }

  // Attachment methods
  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    const attachment: Attachment = {
      ...insertAttachment,
      id,
      messageId: insertAttachment.messageId || null,
      uploadedAt: new Date(),
      expiresAt,
    };
    this.attachments.set(id, attachment);
    return attachment;
  }

  async getMessageAttachments(messageId: string): Promise<Attachment[]> {
    return Array.from(this.attachments.values()).filter(
      (attachment) => attachment.messageId === messageId
    );
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    return this.attachments.get(id);
  }

  async getAttachmentByFilename(filename: string): Promise<Attachment | undefined> {
    return Array.from(this.attachments.values()).find(
      (attachment) => attachment.fileName === filename
    );
  }

  async deleteAttachment(id: string): Promise<void> {
    this.attachments.delete(id);
  }

  async getExpiredAttachments(): Promise<Attachment[]> {
    const now = new Date();
    return Array.from(this.attachments.values()).filter(
      (attachment) => attachment.expiresAt! < now
    );
  }

  async deleteExpiredAttachments(): Promise<void> {
    const expiredAttachments = await this.getExpiredAttachments();
    expiredAttachments.forEach(attachment => {
      this.attachments.delete(attachment.id);
    });
  }
}

// PostgreSQL Storage implementation using Drizzle ORM
export class PostgresStorage implements IStorage {
  async initAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminEmail && adminPassword) {
      const existingAdmin = await this.getUserByEmail(adminEmail);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await db.insert(users).values({
          username: "admin",
          password: hashedPassword,
          email: adminEmail,
          isAdmin: true,
          hasSubscription: true,
          isOnline: false,
        });
        console.log(`Admin user created with email: ${adminEmail}`);
      }
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Subscription methods
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const result = await db.insert(subscriptions).values(subscription).returning();
    
    // Update user hasSubscription flag
    if (subscription.userId) {
      await db.update(users)
        .set({ hasSubscription: true })
        .where(eq(users.id, subscription.userId));
    }
    
    return result[0];
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.purchasedAt));
  }

  async getAllActiveSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions)
      .where(eq(subscriptions.status, "active"));
  }

  // Chat session methods
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const result = await db.insert(chatSessions).values(session).returning();
    return result[0];
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const result = await db.select().from(chatSessions)
      .where(eq(chatSessions.id, id)).limit(1);
    return result[0];
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    return await db.select().from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.lastActivity));
  }

  async getAllActiveChatSessions(): Promise<ChatSession[]> {
    return await db.select().from(chatSessions)
      .where(eq(chatSessions.status, "active"));
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const result = await db.update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, id))
      .returning();
    return result[0];
  }

  // Message methods
  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    
    // Update chat session lastActivity
    if (message.sessionId) {
      await db.update(chatSessions)
        .set({ lastActivity: new Date() })
        .where(eq(chatSessions.id, message.sessionId));
    }
    
    return result[0];
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async getAllUnreadMessages(): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        and(
          eq(messages.isRead, false),
          eq(messages.senderType, "user")
        )
      );
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  async getRecentMessages(limit: number = 50): Promise<Message[]> {
    return await db.select().from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  // Attachment methods
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const result = await db.insert(attachments).values({
      ...attachment,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getMessageAttachments(messageId: string): Promise<Attachment[]> {
    return await db.select().from(attachments)
      .where(eq(attachments.messageId, messageId));
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const result = await db.select().from(attachments)
      .where(eq(attachments.id, id)).limit(1);
    return result[0];
  }

  async getAttachmentByFilename(filename: string): Promise<Attachment | undefined> {
    const result = await db.select().from(attachments)
      .where(eq(attachments.fileName, filename)).limit(1);
    return result[0];
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  async getExpiredAttachments(): Promise<Attachment[]> {
    const now = new Date();
    return await db.select().from(attachments)
      .where(lt(attachments.expiresAt, now));
  }

  async deleteExpiredAttachments(): Promise<void> {
    const now = new Date();
    await db.delete(attachments).where(lt(attachments.expiresAt, now));
  }
}

// Use PostgresStorage for production, MemStorage for testing
export const storage = process.env.NODE_ENV === 'test' 
  ? new MemStorage() 
  : new PostgresStorage();
