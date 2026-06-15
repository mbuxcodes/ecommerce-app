import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
  checkWishlist,
} from "../controllers/wishlist.controller.js";

import {
  addToWishlistValidator,
  removeFromWishlistValidator,
  moveToCartValidator,
} from "../validators/wishlist.validator.js";

import validate      from "../middleware/validate.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// All wishlist routes require authentication
router.use(verifyJWT);

/*
ROUTE ORDER MATTERS:
  Specific routes must come before parameter routes
  /move-to-cart must be before /:productId
  /check/:productId must be before /:productId
*/

// ─── Get & Clear Wishlist ─────────────────────────────────────
router.get("/",    getWishlist);

// ✅ Clear wishlist BEFORE /:productId routes
router.delete("/", clearWishlist);

// ─── Special Actions ──────────────────────────────────────────
router.post(
  "/move-to-cart",
  moveToCartValidator,
  validate,
  moveToCart
);

router.get(
  "/check/:productId",
  checkWishlist
);

// ─── Add to Wishlist ──────────────────────────────────────────
router.post(
  "/",
  addToWishlistValidator,
  validate,
  addToWishlist
);

// ─── Remove from Wishlist ─────────────────────────────────────
router.delete(
  "/:productId",
  removeFromWishlistValidator,
  validate,
  removeFromWishlist
);

export default router;