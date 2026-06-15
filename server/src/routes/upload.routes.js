import { Router } from "express";
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
  getTransformedImage,
} from "../controllers/upload.controller.js";

import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import upload             from "../middleware/upload.middleware.js";

const router = Router();

/*
ALL upload routes require authentication.
We apply verifyJWT at router level.
*/
router.use(verifyJWT);

// ─── Single Image Upload ──────────────────────────────────────
router.post(
  "/single",
  upload.single("image"),
  uploadSingleImage
);

// ─── Multiple Images Upload ───────────────────────────────────
router.post(
  "/multiple",
  upload.array("images", 10),
  uploadMultipleImages
);

// ─── Delete Image (Admin Only) ────────────────────────────────
router.delete(
  "/",
  authorizeRoles("admin"),
  deleteImage
);

// ─── Get Transformed URL (Public after auth) ──────────────────
router.get("/transform", getTransformedImage);

export default router;