import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

import { connectDB } from "./config/database";

// routes
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes";
import playbackRoutes from "./routes/playbackRoutes";

const app = express();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(morgan("dev"));

// 🔑 VERY IMPORTANT: connect DB INSIDE request lifecycle
app.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

// health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api", contentRoutes);
app.use("/api", userRoutes);
app.use("/api", playbackRoutes);
app.use("/api/admin", adminRoutes);

// ❌ NO app.listen()
export default app;
