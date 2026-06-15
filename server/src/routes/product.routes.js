import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  setMainImage,
  getFeaturedProducts,
  getRelatedProducts,
} from "../controllers/product.controller.js";

import {
  createProductValidator,
  updateProductValidator,
  mongoIdValidator,
} from "../validators/product.validator.js";

import validate           from "../middleware/validate.middleware.js";
import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import upload             from "../middleware/upload.middleware.js";

const router = Router();

// ─── Public Routes ─────────────────────────────────────────────
router.get("/",             getAllProducts);
router.get("/featured",     getFeaturedProducts);
router.get("/slug/:slug",   getProductBySlug);

// ─── Admin: Get by ID ──────────────────────────────────────────
router.get(
  "/id/:id",
  verifyJWT,
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  getProductById
);

// ─── Admin: Create Product ─────────────────────────────────────
router.post(
  "/",
  verifyJWT,
  authorizeRoles("admin"),
  upload.array("images", 10),
  createProductValidator,
  validate,
  createProduct
);

// ─── Image Routes (MUST be before /:id routes) ────────────────
router.post(
  "/:id/images",
  verifyJWT,
  authorizeRoles("admin"),
  upload.array("images", 10),
  mongoIdValidator("id"),
  validate,
  uploadProductImages
);

router.delete(
  "/:id/images/:imageId",
  verifyJWT,
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  deleteProductImage
);

router.put(
  "/:id/images/:imageId/main",
  verifyJWT,
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  setMainImage
);

// ─── Related Products ──────────────────────────────────────────
router.get(
  "/:id/related",
  mongoIdValidator("id"),
  validate,
  getRelatedProducts
);

// ─── Admin: Update & Delete Product ───────────────────────────
router.put(
  "/:id",
  verifyJWT,
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  updateProductValidator,
  validate,
  updateProduct
);

router.delete(
  "/:id",
  verifyJWT,
  authorizeRoles("admin"),
  mongoIdValidator("id"),
  validate,
  deleteProduct
);

export default router;