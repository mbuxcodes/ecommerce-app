import { Router } from "express";
import {
  getDashboardOverview,
  getSalesAnalytics,
  getProductAnalytics,
  getUserAnalytics,
  getInventoryAnalytics,
  getSalesReport,
  getRevenueComparison,
  getCategorySalesPerformance,
  exportSalesData,
} from "../controllers/analytics.controller.js";

import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// All analytics routes require admin access
router.use(verifyJWT);
router.use(authorizeRoles("admin"));

// ─── Dashboard Overview ───────────────────────────────────────
router.get("/overview",   getDashboardOverview);

// ─── Sales Analytics ──────────────────────────────────────────
router.get("/sales",              getSalesAnalytics);
router.get("/sales/report",       getSalesReport);
router.get("/sales/comparison",   getRevenueComparison);
router.get("/sales/categories",   getCategorySalesPerformance);
router.get("/sales/export",       exportSalesData);

// ─── Other Analytics ──────────────────────────────────────────
router.get("/products",   getProductAnalytics);
router.get("/users",      getUserAnalytics);
router.get("/inventory",  getInventoryAnalytics);

export default router;