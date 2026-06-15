import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// ─── Route Imports ────────────────────────────────────────────
import authRoutes      from "./src/routes/auth.routes.js";
import userRoutes      from "./src/routes/user.routes.js";
import categoryRoutes  from "./src/routes/category.routes.js";
import productRoutes   from "./src/routes/product.routes.js";
import cartRoutes      from "./src/routes/cart.routes.js";
import wishlistRoutes  from "./src/routes/wishlist.routes.js";
import orderRoutes     from "./src/routes/order.routes.js";
import paymentRoutes   from "./src/routes/payment.routes.js";
import reviewRoutes    from "./src/routes/review.routes.js";
import analyticsRoutes from "./src/routes/analytics.routes.js";
import uploadRoutes    from "./src/routes/upload.routes.js";
import searchRoutes    from "./src/routes/search.routes.js";
import inventoryRoutes from "./src/routes/inventory.routes.js"; // ← ADD THIS

import connectDB         from "./src/config/db.js";
import connectCloudinary from "./src/config/cloudinary.js";
import { apiLimiter }    from "./src/middleware/rateLimit.middleware.js";
import errorHandler      from "./src/middleware/error.middleware.js";
import ApiResponse       from "./src/utils/ApiResponse.js";

// ─── Initialize Express App ───────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Connect to Services ──────────────────────────────────────
connectDB();
connectCloudinary();

// ─── Security Middleware ──────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin:         process.env.CLIENT_URL,
    credentials:    true,
    methods:        ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Stripe Webhook (MUST be before express.json) ─────────────
app.use(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" })
);

// ─── Request Parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Rate Limiting ────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json(
    new ApiResponse(
      200,
      {
        status:      "OK",
        environment: process.env.NODE_ENV,
        timestamp:   new Date().toISOString(),
      },
      "Server is running"
    )
  );
});

// ─── API Routes ───────────────────────────────────────────────
app.use("/api/v1/auth",      authRoutes);
app.use("/api/v1/users",     userRoutes);
app.use("/api/v1/categories",categoryRoutes);
app.use("/api/v1/products",  productRoutes);
app.use("/api/v1/cart",      cartRoutes);
app.use("/api/v1/wishlist",  wishlistRoutes);
app.use("/api/v1/orders",    orderRoutes);
app.use("/api/v1/payment",   paymentRoutes);
app.use("/api/v1/reviews",   reviewRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/upload",    uploadRoutes);
app.use("/api/v1/search",    searchRoutes);
app.use("/api/v1/inventory", inventoryRoutes); // ← ADD THIS

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────┐
  │                                          │
  │   🚀 Server running on port ${PORT}         │
  │   🌍 Environment: ${process.env.NODE_ENV}          │
  │   📡 API: http://localhost:${PORT}/api/v1  │
  │                                          │
  └──────────────────────────────────────────┘
  `);
});

export default app;