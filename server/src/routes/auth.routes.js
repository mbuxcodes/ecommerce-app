import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../validators/auth.validator.js";

import validate          from "../middleware/validate.middleware.js";
import { verifyJWT }     from "../middleware/auth.middleware.js";
import { authLimiter }   from "../middleware/rateLimit.middleware.js";

const router = Router();

/*
MIDDLEWARE CHAIN EXPLANATION:
  router.post("/login", authLimiter, loginValidator, validate, login)
                          ↑               ↑            ↑         ↑
                      Rate limit    Validate input   Check    Controller
                      (max 10/15m)  (express-validator) errors  (business logic)

  Each middleware calls next() to pass to the next one.
  If any middleware throws, it goes to global error handler.
*/

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post(
  "/register",
  authLimiter,          // Max 10 requests per 15 minutes
  registerValidator,    // Validate name, email, password
  validate,             // Check for validation errors
  register              // Create user + return tokens
);

router.post(
  "/login",
  authLimiter,
  loginValidator,
  validate,
  login
);

router.post(
  "/refresh-token",
  refreshAccessToken    // No auth required — uses cookie
);

router.post(
  "/forgot-password",
  authLimiter,
  forgotPasswordValidator,
  validate,
  forgotPassword
);

router.post(
  "/reset-password/:token",
  resetPasswordValidator,
  validate,
  resetPassword
);

// ─── Private Routes (Requires valid JWT) ─────────────────────────────────────
router.post("/logout", verifyJWT, logout);
router.get("/me",      verifyJWT, getMe);

export default router;