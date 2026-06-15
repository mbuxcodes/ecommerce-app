import { Router } from "express";
import {
  searchProducts,
  getSearchSuggestions,
  getAvailableFilters,
  getTrendingProducts,
} from "../controllers/search.controller.js";

const router = Router();

/*
ALL search routes are PUBLIC.
No authentication required to search products.
This improves UX — users can browse without logging in.
*/

// ─── Search Routes ─────────────────────────────────────────────
router.get("/",           searchProducts);
router.get("/suggestions",getSearchSuggestions);
router.get("/filters",    getAvailableFilters);
router.get("/trending",   getTrendingProducts);

export default router;