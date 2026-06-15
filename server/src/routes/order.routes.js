import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  cancelOrder,
  canReviewProduct,
} from "../controllers/order.controller.js";

import {
  createOrderValidator,
  updateOrderStatusValidator,
  orderIdValidator,
} from "../validators/order.validator.js";

import validate           from "../middleware/validate.middleware.js";
import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

router.use(verifyJWT);

// ─── Step 1: Static Routes ────────────────────────────────────
router.get(
  "/all",
  authorizeRoles("admin"),
  getAllOrders
);

router.get(
  "/stats",
  authorizeRoles("admin"),
  getOrderStats
);

router.post(
  "/checkout",
  createOrderValidator,
  validate,
  createOrder
);

router.get("/", getMyOrders);

// ─── Step 2: Sub-path Dynamic Routes ─────────────────────────
router.put(
  "/:id/status",
  authorizeRoles("admin"),
  updateOrderStatusValidator,
  validate,
  updateOrderStatus
);

router.post(
  "/:id/cancel",
  orderIdValidator,
  validate,
  cancelOrder
);

router.get(
  "/review-check/:productId",
  canReviewProduct
);

// ─── Step 3: Simple Dynamic Routes Last ───────────────────────
router.get(
  "/:id",
  orderIdValidator,
  validate,
  getOrderById
);

export default router;