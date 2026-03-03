import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { logger } from "./utils/logger";
import { startScheduledJobs } from "./jobs";
import { rateLimiter } from "./middleware/rateLimiter";
import webhookRoutes from "./routes/webhooks";
import inventoryRoutes from "./routes/inventory";
import reportsRoutes from "./routes/reports";
import notificationsRoutes from "./routes/notifications";
import teamsRoutes from "./routes/teams";
import shopifyOAuthRoutes from "./routes/shopifyOAuth";
import ordersRoutes from "./routes/orders";
import adminRoutes from "./routes/admin";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3002;

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
];

// ── CORS ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: Origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);

// ── Security headers ──────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ── Rate limiter (100 requests per 15 minutes) ───────────────
app.use("/api/", rateLimiter(15 * 60 * 1000, 100));

// ── Raw body for webhook HMAC verification (MUST come first) ──
app.use("/api/webhooks", express.raw({ type: "application/json" }));

// ── JSON for all other routes ──────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ── Request logging ───────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

// ── Health check ──────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use("/api/webhooks", webhookRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/shopify", shopifyOAuthRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin", adminRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use("*", (req, res) => {
  res.status(404).json({
    error: "المورد غير موجود",
    path: req.originalUrl,
    method: req.method,
  });
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(
    `🏠 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`,
  );

  // Start scheduled jobs
  startScheduledJobs();
  logger.info("⏰ Scheduled jobs started");
});

export default app;
