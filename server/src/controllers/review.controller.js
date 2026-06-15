import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Review from "../models/Review.model.js";
import Product from "../models/Product.model.js";
import Order from "../models/Order.model.js";
import { PAGINATION } from "../constants/index.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get all reviews for a product
// @route   GET /api/v1/reviews/:productId
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const {
    page      = PAGINATION.DEFAULT_PAGE,
    limit     = 10,
    sortBy    = "createdAt",
    order     = "desc",
    rating    = "",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), 50);
  const skip     = (pageNum - 1) * limitNum;

  // Verify product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Build filter
  const filter = { product: productId };
  if (rating) filter.rating = parseInt(rating);

  // Build sort
  const sortOrder = order === "asc" ? 1 : -1;
  const sort      = { [sortBy]: sortOrder };

  const [reviews, totalReviews] = await Promise.all([
    Review.find(filter)
      .populate("user", "name avatar")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Review.countDocuments(filter),
  ]);

  /*
  RATING DISTRIBUTION:
    Calculate how many reviews per star rating.
    Used to display rating breakdown bar chart:
    5★ ████████ 8
    4★ █████    5
    3★ ██       2
    2★ █        1
    1★           0
  */
  const ratingDistribution = await Review.aggregate([
    { $match: { product: product._id } },
    {
      $group: {
        _id:   "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  // Format distribution as object
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratingDistribution.forEach((item) => {
    distribution[item._id] = item.count;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        pagination: {
          currentPage:  pageNum,
          totalPages:   Math.ceil(totalReviews / limitNum),
          totalReviews,
          limit:        limitNum,
          hasNextPage:  pageNum < Math.ceil(totalReviews / limitNum),
          hasPrevPage:  pageNum > 1,
        },
        summary: {
          averageRating: product.ratings,
          totalReviews:  product.numReviews,
          distribution,
        },
      },
      "Reviews fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Create a review
// @route   POST /api/v1/reviews/:productId
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const createReview = asyncHandler(async (req, res) => {
  const { productId }        = req.params;
  const { rating, title, comment } = req.body;

  // 1. Verify product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // 2. Check if user already reviewed this product
  const existingReview = await Review.findOne({
    user:    req.user._id,
    product: productId,
  });

  if (existingReview) {
    throw new ApiError(
      409,
      "You have already reviewed this product. You can edit your existing review."
    );
  }

  // 3. Check if user purchased and received the product
  /*
  VERIFIED PURCHASE CHECK:
    Only users who have a DELIVERED order
    containing this product get "Verified Purchase" badge.
    Non-buyers can still review but won't get the badge.
  */
  const deliveredOrder = await Order.findOne({
    user:            req.user._id,
    status:          "delivered",
    "items.product": productId,
  });

  // 4. Create review
  const review = await Review.create({
    user:               req.user._id,
    product:            productId,
    rating:             parseInt(rating),
    title,
    comment,
    isVerifiedPurchase: !!deliveredOrder,
  });

  // Populate user details
  await review.populate("user", "name avatar");

  /*
  NOTE: Product ratings are automatically updated
  by the post-save hook in Review.model.js:
    reviewSchema.post("save", async function () {
      await this.constructor.calculateProductRating(this.product);
    });
  */

  return res.status(201).json(
    new ApiResponse(201, { review }, "Review submitted successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update a review
// @route   PUT /api/v1/reviews/:id
// @access  Private (own review only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Security: Only review owner can update
  if (review.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this review");
  }

  // Update fields
  if (rating  !== undefined) review.rating  = parseInt(rating);
  if (title   !== undefined) review.title   = title;
  if (comment !== undefined) review.comment = comment;

  await review.save();
  // post-save hook auto-updates product rating

  await review.populate("user", "name avatar");

  return res.status(200).json(
    new ApiResponse(200, { review }, "Review updated successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Delete a review
// @route   DELETE /api/v1/reviews/:id
// @access  Private (own review or Admin)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Security: Only review owner or admin can delete
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Not authorized to delete this review");
  }

  await Review.findByIdAndDelete(req.params.id);
  // post-delete hook auto-updates product rating

  return res.status(200).json(
    new ApiResponse(200, {}, "Review deleted successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Mark review as helpful
// @route   POST /api/v1/reviews/:id/helpful
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Cannot mark own review as helpful
  if (review.user.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot mark your own review as helpful");
  }

  // Increment helpful votes
  review.helpfulVotes += 1;
  await review.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      { helpfulVotes: review.helpfulVotes },
      "Marked as helpful"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get current user's reviews
// @route   GET /api/v1/reviews/user/my-reviews
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getMyReviews = asyncHandler(async (req, res) => {
  const {
    page  = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  const [reviews, totalReviews] = await Promise.all([
    Review.find({ user: req.user._id })
      .populate("product", "name slug images price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Review.countDocuments({ user: req.user._id }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        pagination: {
          currentPage:  pageNum,
          totalPages:   Math.ceil(totalReviews / limitNum),
          totalReviews,
          limit:        limitNum,
        },
      },
      "Your reviews fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get all reviews - Admin
// @route   GET /api/v1/reviews/admin/all
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAllReviews = asyncHandler(async (req, res) => {
  const {
    page   = PAGINATION.DEFAULT_PAGE,
    limit  = PAGINATION.DEFAULT_LIMIT,
    rating = "",
    search = "",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  const filter = {};
  if (rating) filter.rating = parseInt(rating);
  if (search) {
    filter.$or = [
      { title:   { $regex: search, $options: "i" } },
      { comment: { $regex: search, $options: "i" } },
    ];
  }

  const [reviews, totalReviews] = await Promise.all([
    Review.find(filter)
      .populate("user",    "name email avatar")
      .populate("product", "name slug images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Review.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        pagination: {
          currentPage:  pageNum,
          totalPages:   Math.ceil(totalReviews / limitNum),
          totalReviews,
          limit:        limitNum,
        },
      },
      "All reviews fetched successfully"
    )
  );
});