import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Category name is required"],
      unique:    true,
      trim:      true,
      minlength: [2,  "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    slug: {
      type:      String,
      unique:    true,
      lowercase: true,
    },

    description: {
      type:      String,
      default:   "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    image: {
      url:      { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    parent: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Category",
      default: null,
    },

    isActive:     { type: Boolean, default: true },
    productCount: { type: Number,  default: 0    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });

// ─── Pre-Save Hook (Mongoose 8.x) ────────────────────────────
categorySchema.pre("save", function () {
  if (!this.isModified("name")) return;

  this.slug = slugify(this.name, {
    lower:  true,
    strict: true,
    trim:   true,
  });
});

// ─── Virtual: subcategories ───────────────────────────────────
categorySchema.virtual("subcategories", {
  ref:          "Category",
  localField:   "_id",
  foreignField: "parent",
});

const Category = mongoose.model("Category", categorySchema);
export default Category;