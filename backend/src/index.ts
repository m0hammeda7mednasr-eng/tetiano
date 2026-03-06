import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors, { CorsOptions } from "cors";
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

// CORS Configuration - Updated for Vercel and Railway
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ALLOWED_ORIGINS,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://tetiano.vercel.app",
]
  .flatMap((entry) => (entry ? entry.split(",") : []))
  .map((entry) => entry.trim())
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

const patternStrings = (process.env.CORS_ALLOWED_ORIGIN_PATTERNS || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const allowedOriginPatterns: RegExp[] = [
  /^https:\/\/tetiano(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/.*\.vercel\.app$/i, // Allow all Vercel deployments
  /^https:\/\/[a-z0-9-]+\.railway\.app$/i,
];

for (const patternText of patternStrings) {
  try {
    allowedOriginPatterns.push(new RegExp(patternText, "i"));
  } catch {
    logger.warn("Invalid CORS regex pattern ignored", { patternText });
  }
}

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    logger.warn("CORS origin blocked", { origin });
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204,
};

// CORS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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

