import { Router } from "express";
import {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import {
  createCategoryValidator,
  updateCategoryValidator,
  mongoIdValidator,
} from "../validators/category.validator.js";

import validate           from "../middleware/validate.middleware.js";
import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import upload             from "../middleware/upload.middleware.js";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────
router.get("/",      getAllCategories);
router.get("/:slug", getCategoryBySlug);

// ─── Admin Routes ─────────────────────────────────────────────
router.post(
  "/",
  verifyJWT,
  authorizeRoles("admin"),
  upload.single("image"),
  createCategoryValidator,
  validate,
  createCategory
);

router.put(
  "/:id",
  verifyJWT,
  authorizeRoles("admin"),
  upload.single("image"),
  mongoIdValidator("id"),
  updateCategoryValidator,
  validate,
  updateCategory
);

router.delete(
  "/:id",
  verifyJWT,
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  deleteCategory
);

export default router;