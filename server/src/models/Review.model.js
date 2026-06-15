import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
    },

    rating: {
      type:     Number,
      required: [true, "Rating is required"],
      min:      [1, "Rating must be at least 1"],
      max:      [5, "Rating cannot exceed 5"],
    },

    title: {
      type:      String,
      required:  [true, "Review title is required"],
      trim:      true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    comment: {
      type:      String,
      required:  [true, "Review comment is required"],
      trim:      true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },

    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulVotes:       { type: Number,  default: 0    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

// ─── Static Method: Calculate Product Rating ──────────────────
reviewSchema.statics.calculateProductRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id:        "$product",
        avgRating:  { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      ratings:    Math.round(stats[0].avgRating * 10) / 10,
      numReviews: stats[0].numReviews,
    });
  } else {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      ratings:    0,
      numReviews: 0,
    });
  }
};

// ─── Post Hooks (Mongoose 8.x) ────────────────────────────────
reviewSchema.post("save", async function () {
  await this.constructor.calculateProductRating(this.product);
});

reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.calculateProductRating(doc.product);
  }
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;