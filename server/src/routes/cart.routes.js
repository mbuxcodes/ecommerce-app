import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller.js";

import {
  addToCartValidator,
  updateCartValidator,
  cartItemIdValidator,
} from "../validators/cart.validator.js";

import validate      from "../middleware/validate.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// All cart routes require authentication
router.use(verifyJWT);

/*
ROUTE ORDER MATTERS:
  DELETE /cart        → clearCart    (must be first)
  DELETE /cart/:itemId → removeCartItem

  If /:itemId is first, "/" also matches it with empty string
  So we define the more specific "/" route first
*/

router.get("/",   getCart);
router.post("/",  addToCartValidator, validate, addToCart);

// ✅ Clear cart BEFORE remove item (order matters)
router.delete("/", clearCart);

router.put(
  "/:itemId",
  cartItemIdValidator,
  updateCartValidator,
  validate,
  updateCartItem
);

router.delete(
  "/:itemId",
  cartItemIdValidator,
  validate,
  removeCartItem
);

export default router;