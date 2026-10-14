import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS configuration - allow localhost / Vite dev server
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        config.frontendUrl,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation"), false);
    },
    credentials: true,
  }),
);

// Standard JSON body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Basic rate limiting for speech generation
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Simple request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use("/api", routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found" });
});

// Centralized error handling
app.use(errorHandler);

export default app;
