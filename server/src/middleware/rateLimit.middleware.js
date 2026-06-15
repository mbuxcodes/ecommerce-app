import rateLimit from "express-rate-limit";

/*
WHY RATE LIMITING:
  Without it, attackers can:
  - Try millions of passwords (brute force login)
  - Spam your API with thousands of requests
  - Cause denial of service (DoS)

  We create different limiters for different sensitivity levels.
*/

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // Max 100 requests per window per IP
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Strict limiter for auth routes (login, register, forgot-password)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                    // Max 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again after 15 minutes",
  },
});

// Payment route limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                   // Max 20 payment attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many payment requests, please try again after an hour",
  },
});