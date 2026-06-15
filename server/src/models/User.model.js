import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { USER_ROLES } from "../constants/index.js";

const addressSchema = new mongoose.Schema(
  {
    fullName:   { type: String, required: true },
    phone:      { type: String, required: true },
    street:     { type: String, required: true },
    city:       { type: String, required: true },
    state:      { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true },
    isDefault:  { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      minlength: [2,  "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },

    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select:    false,
    },

    role: {
      type:    String,
      enum:    Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
    },

    avatar: {
      url:      { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    phone: {
      type:    String,
      default: "",
      trim:    true,
    },

    addresses: [addressSchema],

    refreshToken: {
      type:   String,
      select: false,
    },

    resetPasswordToken:  { type: String, select: false },
    resetPasswordExpiry: { type: Date,   select: false },

    isVerified: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true  },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// ─── Pre-Save Hook: Hash Password (Mongoose 8.x style) ───────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ─── Instance Method: Compare Password ───────────────────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Instance Method: Get Public Profile ─────────────────────────────────────
userSchema.methods.getPublicProfile = function () {
  return {
    _id:        this._id,
    name:       this.name,
    email:      this.email,
    role:       this.role,
    avatar:     this.avatar,
    phone:      this.phone,
    addresses:  this.addresses,
    isVerified: this.isVerified,
    isActive:   this.isActive,
    createdAt:  this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;