import { Router } from "express";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getMyReviews,
  getAllReviews,
} from "../controllers/review.controller.js";

import {
  createReviewValidator,
  updateReviewValidator,
  reviewIdValidator,
  productIdValidator,
} from "../validators/review.validator.js";

import validate           from "../middleware/validate.middleware.js";
import { verifyJWT }      from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

/*
ROUTE ORDER:
  Static routes first:
    /user/my-reviews
    /admin/all
  Dynamic routes last:
    /:productId
    /:id
*/

// ─── Static Routes ─────────────────────────────────────────────

// User: Get my reviews
router.get(
  "/user/my-reviews",
  verifyJWT,
  getMyReviews
);

// Admin: Get all reviews
router.get(
  "/admin/all",
  verifyJWT,
  authorizeRoles("admin"),
  getAllReviews
);

// ─── Product Reviews ───────────────────────────────────────────

// Public: Get all reviews for a product
router.get(
  "/:productId",
  productIdValidator,
  validate,
  getProductReviews
);

// Private: Create review for a product
router.post(
  "/:productId",
  verifyJWT,
  productIdValidator,
  createReviewValidator,
  validate,
  createReview
);

// ─── Single Review Operations ──────────────────────────────────

// Private: Update own review
router.put(
  "/:id",
  verifyJWT,
  reviewIdValidator,
  updateReviewValidator,
  validate,
  updateReview
);

// Private: Delete review (own or admin)
router.delete(
  "/:id",
  verifyJWT,
  reviewIdValidator,
  validate,
  deleteReview
);

// Private: Mark review as helpful
router.post(
  "/:id/helpful",
  verifyJWT,
  reviewIdValidator,
  validate,
  markHelpful
);

export default router;