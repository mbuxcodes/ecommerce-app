import { Router } from "express";
import {
  getInventory,
  updateStock,
  bulkUpdateStock,
  getLowStockProducts,
  getOutOfStockProducts,
  restockProducts,
  getInventoryReport,
} from "../controllers/inventory.controller.js";

import {
  updateStockValidator,
  bulkUpdateStockValidator,
  restockValidator,
} from "../validators/inventory.validator.js";

import validate           from "../middleware/validate.middleware.js";
import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// All inventory routes require admin access
router.use(verifyJWT);
router.use(authorizeRoles("admin"));

/*
ROUTE ORDER:
  Static routes first → /low-stock, /out-of-stock, /report
  Dynamic routes last → /:id/stock
*/

// ─── Static Routes ─────────────────────────────────────────────
router.get("/",             getInventory);
router.get("/low-stock",    getLowStockProducts);
router.get("/out-of-stock", getOutOfStockProducts);
router.get("/report",       getInventoryReport);

// ─── Action Routes ─────────────────────────────────────────────
router.put(
  "/bulk-stock",
  bulkUpdateStockValidator,
  validate,
  bulkUpdateStock
);

router.post(
  "/restock",
  restockValidator,
  validate,
  restockProducts
);

// ─── Dynamic Routes Last ───────────────────────────────────────
router.put(
  "/:id/stock",
  updateStockValidator,
  validate,
  updateStock
);

export default router;