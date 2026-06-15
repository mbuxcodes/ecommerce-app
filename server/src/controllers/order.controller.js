import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Order from "../models/Order.model.js";
import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import { PAGINATION, ORDER_STATUS } from "../constants/index.js";

// ─── Helper: Calculate Prices ─────────────────────────────────
const calculatePrices = (items) => {
  const itemsPrice = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const shippingPrice = itemsPrice > 100 ? 0 : 10;
  const taxPrice      = parseFloat((itemsPrice * 0.08).toFixed(2));
  const totalPrice    = parseFloat(
    (itemsPrice + shippingPrice + taxPrice).toFixed(2)
  );
  return {
    itemsPrice:    parseFloat(itemsPrice.toFixed(2)),
    shippingPrice: parseFloat(shippingPrice.toFixed(2)),
    taxPrice,
    totalPrice,
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Create order (Checkout)
// @route   POST /api/v1/orders/checkout
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  // 1. Get user cart
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path:   "items.product",
    select: "name price images stock isActive",
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty. Add items before checkout.");
  }

  // 2. Validate all cart items
  const validationErrors = [];

  for (const item of cart.items) {
    if (!item.product) {
      validationErrors.push("A product in your cart no longer exists");
      continue;
    }
    if (!item.product.isActive) {
      validationErrors.push(`"${item.product.name}" is no longer available`);
      continue;
    }
    if (item.product.stock < item.quantity) {
      validationErrors.push(
        `"${item.product.name}" only has ${item.product.stock} item(s) in stock`
      );
    }
  }

  if (validationErrors.length > 0) {
    throw new ApiError(400, validationErrors.join(". "));
  }

  // 3. Build order items with price snapshot
  const orderItems = cart.items.map((item) => ({
    product:  item.product._id,
    name:     item.product.name,
    image:    item.product.images?.[0]?.url || "",
    price:    item.product.price,
    quantity: item.quantity,
  }));

  // 4. Calculate prices on server
  const { itemsPrice, shippingPrice, taxPrice, totalPrice } =
    calculatePrices(orderItems);

  // 5. Create order
  const order = await Order.create({
    user:            req.user._id,
    items:           orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    isPaid:        false,
    paymentStatus: "pending",
    status:        ORDER_STATUS.PENDING,
  });

  // 6. Update stock atomically
  const stockUpdatePromises = cart.items.map((item) =>
    Product.findByIdAndUpdate(item.product._id, {
      $inc: {
        stock: -item.quantity,
        sold:   item.quantity,
      },
    })
  );
  await Promise.all(stockUpdatePromises);

  // 7. Clear cart
  cart.items = [];
  await cart.save();

  await order.populate("user", "name email");

  return res.status(201).json(
    new ApiResponse(201, { order }, "Order placed successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get logged in user orders
// @route   GET /api/v1/orders
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getMyOrders = asyncHandler(async (req, res) => {
  const {
    page   = PAGINATION.DEFAULT_PAGE,
    limit  = PAGINATION.DEFAULT_LIMIT,
    status = "",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages:  Math.ceil(totalOrders / limitNum),
          totalOrders,
          limit:       limitNum,
          hasNextPage: pageNum < Math.ceil(totalOrders / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
      "Orders fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get single order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email phone")
    .select("-__v");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Security check
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Not authorized to view this order");
  }

  return res.status(200).json(
    new ApiResponse(200, { order }, "Order fetched successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get all orders - Admin
// @route   GET /api/v1/orders/all
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page          = PAGINATION.DEFAULT_PAGE,
    limit         = PAGINATION.DEFAULT_LIMIT,
    status        = "",
    paymentStatus = "",
    paymentMethod = "",
    search        = "",
    sortBy        = "createdAt",
    order         = "desc",
    startDate     = "",
    endDate       = "",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  // ─── Build Filter ──────────────────────────────────────────
  const filter = {};
  if (status)        filter.status        = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
    ];
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate)   filter.createdAt.$lte = new Date(endDate);
  }

  const sortOrder = order === "asc" ? 1 : -1;
  const sort      = { [sortBy]: sortOrder };

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Order.countDocuments(filter),
  ]);

  // Calculate revenue from completed orders
  const revenueResult = await Order.aggregate([
    { $match: { paymentStatus: "completed" } },
    {
      $group: {
        _id:          null,
        totalRevenue: { $sum: "$totalPrice" },
        totalOrders:  { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = revenueResult[0]?.totalRevenue || 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages:  Math.ceil(totalOrders / limitNum),
          totalOrders,
          limit:       limitNum,
          hasNextPage: pageNum < Math.ceil(totalOrders / limitNum),
          hasPrevPage: pageNum > 1,
        },
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      },
      "All orders fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get order statistics - Admin
// @route   GET /api/v1/orders/stats
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getOrderStats = asyncHandler(async (req, res) => {
  const { period = "monthly" } = req.query;

  // ─── Overall Stats ─────────────────────────────────────────
  const [
    overallStats,
    statusBreakdown,
    paymentMethodBreakdown,
    recentOrders,
    salesByPeriod,
  ] = await Promise.all([

    // 1. Overall statistics
    Order.aggregate([
      {
        $group: {
          _id:           null,
          totalOrders:   { $sum: 1 },
          totalRevenue:  { $sum: "$totalPrice" },
          paidRevenue:   {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "completed"] }, "$totalPrice", 0],
            },
          },
          avgOrderValue: { $avg: "$totalPrice" },
        },
      },
    ]),

    // 2. Orders by status
    Order.aggregate([
      {
        $group: {
          _id:   "$status",
          count: { $sum: 1 },
          total: { $sum: "$totalPrice" },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 3. Orders by payment method
    Order.aggregate([
      {
        $group: {
          _id:   "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$totalPrice" },
        },
      },
    ]),

    // 4. Recent 5 orders
    Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber status totalPrice createdAt paymentMethod"),

    // 5. Sales by period (monthly/daily)
    Order.aggregate([
      {
        $group: {
          _id: period === "daily"
            ? {
                year:  { $year:  "$createdAt" },
                month: { $month: "$createdAt" },
                day:   { $dayOfMonth: "$createdAt" },
              }
            : {
                year:  { $year:  "$createdAt" },
                month: { $month: "$createdAt" },
              },
          totalSales:  { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 12 },
    ]),
  ]);

  // Format overall stats
  const stats = overallStats[0] || {
    totalOrders:   0,
    totalRevenue:  0,
    paidRevenue:   0,
    avgOrderValue: 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: {
          totalOrders:   stats.totalOrders,
          totalRevenue:  parseFloat(stats.totalRevenue.toFixed(2)),
          paidRevenue:   parseFloat(stats.paidRevenue.toFixed(2)),
          avgOrderValue: parseFloat(stats.avgOrderValue.toFixed(2)),
        },
        statusBreakdown,
        paymentMethodBreakdown,
        recentOrders,
        salesByPeriod: salesByPeriod.reverse(),
      },
      "Order statistics fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update order status - Admin
// @route   PUT /api/v1/orders/:id/status
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Status flow validation
  const statusFlow = {
    pending:    0,
    processing: 1,
    shipped:    2,
    delivered:  3,
    cancelled:  4,
  };

  if (
    order.status !== "cancelled" &&
    status       !== "cancelled" &&
    statusFlow[status] < statusFlow[order.status]
  ) {
    throw new ApiError(
      400,
      `Cannot change status from "${order.status}" to "${status}"`
    );
  }

  // Restore stock if cancelling
  if (status === "cancelled" && order.status !== "cancelled") {
    const stockRestorePromises = order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock:  item.quantity,
          sold:  -item.quantity,
        },
      })
    );
    await Promise.all(stockRestorePromises);
  }

  // Update order
  order.status = status;
  if (notes) order.notes = notes;

  // Auto set delivery fields
  if (status === "delivered") {
    order.isDelivered   = true;
    order.deliveredAt   = new Date();
    order.paymentStatus = "completed";
    if (order.paymentMethod === "cod") {
      order.isPaid  = true;
      order.paidAt  = new Date();
    }
  }

  await order.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { order },
      `Order status updated to "${status}" successfully`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Cancel order - User
// @route   POST /api/v1/orders/:id/cancel
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Security check
  if (order.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to cancel this order");
  }

  // Only pending or processing can be cancelled
  if (!["pending", "processing"].includes(order.status)) {
    throw new ApiError(
      400,
      `Cannot cancel order with status "${order.status}"`
    );
  }

  // Restore stock
  const stockRestorePromises = order.items.map((item) =>
    Product.findByIdAndUpdate(item.product, {
      $inc: {
        stock:  item.quantity,
        sold:  -item.quantity,
      },
    })
  );
  await Promise.all(stockRestorePromises);

  order.status = ORDER_STATUS.CANCELLED;
  await order.save();

  return res.status(200).json(
    new ApiResponse(200, { order }, "Order cancelled successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Check if user can review a product
// @route   GET /api/v1/orders/review-check/:productId
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const canReviewProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  /*
  REVIEW ELIGIBILITY:
    A user can only review a product if they have
    a DELIVERED order containing that product.
    This prevents fake reviews from non-buyers.
  */
  const order = await Order.findOne({
    user:            req.user._id,
    status:          "delivered",
    "items.product": productId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        canReview: !!order,
        orderId:   order?._id || null,
      },
      order
        ? "You can review this product"
        : "You need to purchase and receive this product before reviewing"
    )
  );
});