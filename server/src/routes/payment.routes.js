import { Router } from "express";
import {
  getStripeConfig,
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
} from "../controllers/payment.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { paymentLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

/*
IMPORTANT:
  The webhook route uses express.raw() body parser
  which is already configured in server.js BEFORE
  express.json() middleware.

  DO NOT add express.json() to webhook route here.
  The raw body is needed for Stripe signature verification.
*/

// ─── Public Routes ─────────────────────────────────────────────
router.get("/config", getStripeConfig);

// ─── Stripe Webhook (No Auth — Stripe calls this) ─────────────
router.post("/webhook", stripeWebhook);

// ─── Private Routes ────────────────────────────────────────────
router.post(
  "/create-intent",
  verifyJWT,
  paymentLimiter,
  createPaymentIntent
);

router.post(
  "/confirm",
  verifyJWT,
  confirmPayment
);

export default router;