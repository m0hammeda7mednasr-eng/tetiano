import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

/**
 * Rate limiter middleware
 * Default: 100 requests per 15 minutes per IP
 */
export const rateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();

    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + windowMs };
      next();
      return;
    }

    if (now > store[key].resetTime) {
      store[key] = { count: 1, resetTime: now + windowMs };
      next();
      return;
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      logger.warn("Rate limit exceeded", { ip: key, count: store[key].count });
      return res.status(429).json({
        error: "طلبات كثيرة جداً. حاول لاحقاً.",
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }

    res.set("RateLimit-Remaining", String(maxRequests - store[key].count));

    next();
  };
};

/**
 * Clean up expired entries every 5 minutes
 */
setInterval(
  () => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  },
  5 * 60 * 1000,
);
