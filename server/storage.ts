import { 
  type User, type InsertUser,
  type Subscription, type InsertSubscription,
  type ChatSession, type InsertChatSession,
  type Message, type InsertMessage
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private subscriptions: Map<string, Subscription>;
  private chatSessions: Map<string, ChatSession>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.subscriptions = new Map();
    this.chatSessions = new Map();
    this.messages = new Map();
    
    // Create admin user with hashed password
    this.initAdminUser();
  }

  private async initAdminUser() {
    const hashedPassword = await bcrypt.hash("Xander12.", 12);
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      password: hashedPassword,
      email: "wiktoriatopajew@gmail.com",
      isAdmin: true,
      hasSubscription: true,
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
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
    const user: User = { 
      ...insertUser,
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
}

export const storage = new MemStorage();
