import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,  // ← already creates an index
    },

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "Product",
      },
    ],
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// ✅ Removed { user: 1 } — already indexed via unique: true

// ─── Virtual: Total Wishlisted Items ──────────────────────────────────────────
wishlistSchema.virtual("totalItems").get(function () {
  return this.products.length;
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;