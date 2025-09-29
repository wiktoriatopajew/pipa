import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import fs from "fs";

const app = express();

// Initialize admin user after environment variables are loaded
storage.initAdminUser();

// Cleanup expired files function
const cleanupExpiredFiles = async () => {
  try {
    console.log("Starting cleanup of expired files...");
    const expiredAttachments = await storage.getExpiredAttachments();
    
    for (const attachment of expiredAttachments) {
      try {
        // Delete physical file
        if (fs.existsSync(attachment.filePath)) {
          fs.unlinkSync(attachment.filePath);
          console.log(`Deleted expired file: ${attachment.filePath}`);
        }
        
        // Delete attachment record
        await storage.deleteAttachment(attachment.id);
        console.log(`Deleted expired attachment record: ${attachment.id}`);
      } catch (error) {
        console.error(`Error deleting attachment ${attachment.id}:`, error);
      }
    }
    
    console.log(`Cleanup completed. Removed ${expiredAttachments.length} expired files.`);
  } catch (error) {
    console.error("Error during file cleanup:", error);
  }
};

// Run cleanup on startup
cleanupExpiredFiles();

// Schedule cleanup to run every 24 hours (86400000 ms)
setInterval(cleanupExpiredFiles, 86400000);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'production' 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: process.env.NODE_ENV === 'production'
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Validate SESSION_SECRET for production security
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

// Configure secure session management with memory store for development
// WARNING: MemoryStore is not suitable for production - use Redis or similar persistent store
if (process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Using MemoryStore in production is not recommended. Switch to Redis or persistent session store.');
}

const MemoryStoreSession = MemoryStore(session);

app.use(session({
  store: new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-please-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict',
  },
  name: 'chatwithmechanic.sid',
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response body in development to avoid logging sensitive data
      if (capturedJsonResponse && process.env.NODE_ENV !== 'production') {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
