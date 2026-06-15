import mongoose from "mongoose";
import { ORDER_STATUS, PAYMENT_STATUS } from "../constants/index.js";

const orderItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name:     { type: String, required: true },
    image:    { type: String, required: true },
    price:    { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName:   { type: String, required: true },
    phone:      { type: String, required: true },
    street:     { type: String, required: true },
    city:       { type: String, required: true },
    state:      { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type:   String,
      unique: true,
    },

    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    items: {
      type:     [orderItemSchema],
      required: true,
      validate: {
        validator: function (v) { return v.length > 0; },
        message:   "Order must have at least one item",
      },
    },

    shippingAddress: {
      type:     shippingAddressSchema,
      required: true,
    },

    paymentMethod: {
      type:     String,
      required: true,
      enum:     ["stripe", "cod"],
    },

    paymentResult: {
      stripePaymentIntentId: { type: String, default: "" },
      stripeChargeId:        { type: String, default: "" },
      status:                { type: String, default: "" },
      emailAddress:          { type: String, default: "" },
    },

    itemsPrice:    { type: Number, required: true, default: 0 },
    shippingPrice: { type: Number, required: true, default: 0 },
    taxPrice:      { type: Number, required: true, default: 0 },
    totalPrice:    { type: Number, required: true, default: 0 },

    status: {
      type:    String,
      enum:    Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },

    paymentStatus: {
      type:    String,
      enum:    Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },

    isPaid:      { type: Boolean, default: false },
    paidAt:      { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    notes:       { type: String,  default: "" },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// ─── Pre-Save Hook (Mongoose 8.x) ────────────────────────────
orderSchema.pre("save", function () {
  if (!this.isNew) return;

  const timestamp  = Date.now();
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  this.orderNumber = `ORD-${timestamp}-${randomPart}`;
});

const Order = mongoose.model("Order", orderSchema);
export default Order;