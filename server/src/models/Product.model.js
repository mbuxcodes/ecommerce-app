import mongoose from "mongoose";
import slugify from "slugify";

const productImageSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    isMain:   { type: Boolean, default: false },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Product name is required"],
      trim:      true,
      minlength: [3,   "Name must be at least 3 characters"],
      maxlength: [200, "Name cannot exceed 200 characters"],
    },

    slug: {
      type:      String,
      unique:    true,
      lowercase: true,
    },

    description: {
      type:      String,
      required:  [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    shortDescription: {
      type:      String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
      default:   "",
    },

    price: {
      type:     Number,
      required: [true, "Price is required"],
      min:      [0,    "Price cannot be negative"],
    },

    comparePrice: {
      type:    Number,
      default: 0,
      min:     [0, "Compare price cannot be negative"],
    },

    category: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Category",
      required: [true, "Category is required"],
    },

    images: {
      type: [productImageSchema],
      validate: {
        validator: function (v) { return v.length <= 10; },
        message:   "A product cannot have more than 10 images",
      },
    },

    stock: {
      type:     Number,
      required: [true, "Stock is required"],
      min:      [0,    "Stock cannot be negative"],
      default:  0,
    },

    sold:       { type: Number, default: 0 },
    ratings:    { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },

    tags: { type: [String] },

    attributes: {
      type: Map,
      of:   String,
    },

    sku: {
      type:   String,
      unique: true,
      sparse: true,
    },

    isFeatured: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true  },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

// ─── Pre-Save Hook (Mongoose 8.x) ────────────────────────────
productSchema.pre("save", function () {
  if (!this.isModified("name")) return;

  this.slug = slugify(this.name, {
    lower:  true,
    strict: true,
    trim:   true,
  });
});

// ─── Virtual: Discount Percentage ────────────────────────────
productSchema.virtual("discountPercent").get(function () {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(
    ((this.comparePrice - this.price) / this.comparePrice) * 100
  );
});

// ─── Virtual: In Stock ────────────────────────────────────────
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// ─── Virtual: Reviews ─────────────────────────────────────────
productSchema.virtual("reviews", {
  ref:          "Review",
  localField:   "_id",
  foreignField: "product",
});

const Product = mongoose.model("Product", productSchema);
export default Product;