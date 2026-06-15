import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
    },
    quantity: {
      type:     Number,
      required: true,
      min:      [1,   "Quantity must be at least 1"],
      max:      [100, "Quantity cannot exceed 100"],
      default:  1,
    },
    price: {
      type:     Number,
      required: true,
    },
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,  // ← already creates an index
    },

    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// ✅ Removed { user: 1 } — already indexed via unique: true

// ─── Virtual: Total Items Count ───────────────────────────────────────────────
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// ─── Virtual: Total Price ─────────────────────────────────────────────────────
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce(
    (total, item) => total + item.price * item.quantity, 0
  );
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;