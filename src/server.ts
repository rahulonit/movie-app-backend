/**
 * Serverless-compatible Express app for Vercel
 * ------------------------------------------------
 * - NO app.listen()
 * - NO startup DB mutations
 * - NO process.exit / process lifecycle hooks
 * - Lazy DB connection handled inside requests
 */

import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/database";
import { errorHandler, notFound } from "./middleware/error";

// Routes
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes";

// --------------------------------------------------
// Create Express App (NO server start)
// --------------------------------------------------
const app: Application = express();

// --------------------------------------------------
// Security Middleware
// --------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// --------------------------------------------------
// CORS Configuration
// --------------------------------------------------
const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];

const corsOptions =
  process.env.NODE_ENV === "development"
    ? { origin: true, credentials: true }
    : {
        origin: (origin: string | undefined, callback: Function) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true
      };

app.use(cors(corsOptions));

// --------------------------------------------------
// Body Parsing & Compression
// --------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// --------------------------------------------------
// Logging
// --------------------------------------------------
app.use(
  process.env.NODE_ENV === "development"
    ? morgan("dev")
    : morgan("combined")
);

// --------------------------------------------------
// Rate Limiting (API only)
// --------------------------------------------------
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", limiter);

// --------------------------------------------------
// Lazy DB Connection Middleware (SERVERLESS SAFE)
// --------------------------------------------------
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// Health Check (Vercel-friendly)
// --------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------
// API Routes
// --------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api", contentRoutes);
app.use("/api", userRoutes);
app.use("/api/admin", adminRoutes);

// --------------------------------------------------
// 404 + Error Handling
// --------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// --------------------------------------------------
// EXPORT ONLY (NO listen)
// --------------------------------------------------
export default app;
