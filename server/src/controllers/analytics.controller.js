import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import Category from "../models/Category.model.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get dashboard overview
// @route   GET /api/v1/analytics/overview
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const [
    revenueStats,
    orderStats,
    userStats,
    productStats,
    lowStockCount,
    pendingOrdersCount,
    recentOrders,
    topProducts,
  ] = await Promise.all([

    Order.aggregate([
      {
        $group: {
          _id:           null,
          totalRevenue:  { $sum: "$totalPrice" },
          paidRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "completed"] },
                "$totalPrice",
                0,
              ],
            },
          },
          avgOrderValue: { $avg: "$totalPrice" },
          totalOrders:   { $sum: 1 },
        },
      },
    ]),

    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    User.aggregate([
      {
        $group: {
          _id:         null,
          totalUsers:  { $sum: 1 },
          activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
          adminCount: {
            $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
          },
        },
      },
    ]),

    Product.aggregate([
      {
        $group: {
          _id:              null,
          totalProducts:    { $sum: 1 },
          activeProducts:   { $sum: { $cond: ["$isActive",    1, 0] } },
          featuredProducts: { $sum: { $cond: ["$isFeatured",  1, 0] } },
          totalStock:       { $sum: "$stock" },
          totalSold:        { $sum: "$sold"  },
        },
      },
    ]),

    Product.countDocuments({ stock: { $lte: 10, $gt: 0 }, isActive: true }),
    Order.countDocuments({ status: "pending" }),

    Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber status totalPrice paymentMethod createdAt user"),

    Product.find()
      .sort({ sold: -1 })
      .limit(5)
      .select("name slug price sold ratings images")
      .populate("category", "name"),
  ]);

  const revenue  = revenueStats[0]  || { totalRevenue: 0, paidRevenue: 0, avgOrderValue: 0, totalOrders: 0 };
  const users    = userStats[0]     || { totalUsers: 0, activeUsers: 0, adminCount: 0 };
  const products = productStats[0]  || { totalProducts: 0, activeProducts: 0, featuredProducts: 0, totalStock: 0, totalSold: 0 };

  const orderStatusMap = {};
  orderStats.forEach((item) => { orderStatusMap[item._id] = item.count; });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        revenue: {
          total:         parseFloat(revenue.totalRevenue.toFixed(2)),
          paid:          parseFloat(revenue.paidRevenue.toFixed(2)),
          avgOrderValue: parseFloat(revenue.avgOrderValue.toFixed(2)),
        },
        orders: {
          total:    revenue.totalOrders,
          pending:  pendingOrdersCount,
          byStatus: orderStatusMap,
        },
        users: {
          total:     users.totalUsers,
          active:    users.activeUsers,
          admins:    users.adminCount,
          customers: users.totalUsers - users.adminCount,
        },
        products: {
          total:      products.totalProducts,
          active:     products.activeProducts,
          featured:   products.featuredProducts,
          lowStock:   lowStockCount,
          totalStock: products.totalStock,
          totalSold:  products.totalSold,
        },
        recentOrders,
        topProducts,
      },
      "Dashboard overview fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get sales analytics
// @route   GET /api/v1/analytics/sales
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const {
    period    = "monthly",
    startDate = "",
    endDate   = "",
  } = req.query;

  const dateFilter  = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(endDate);
  const matchStage  = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  let groupId;
  switch (period) {
    case "daily":
      groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };
      break;
    case "weekly":
      groupId = { year: { $year: "$createdAt" }, week: { $week: "$createdAt" } };
      break;
    case "yearly":
      groupId = { year: { $year: "$createdAt" } };
      break;
    default:
      groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
  }

  const [salesByPeriod, salesByCategory, salesByPaymentMethod, monthlyComparison] =
    await Promise.all([

      Order.aggregate([
        { $match: matchStage },
        { $group: { _id: groupId, totalSales: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 }, avgOrder: { $avg: "$totalPrice" } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),

      Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productData" } },
        { $unwind: { path: "$productData", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "categories", localField: "productData.category", foreignField: "_id", as: "categoryData" } },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$categoryData.name", totalSales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, totalItems: { $sum: "$items.quantity" } } },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
      ]),

      Order.aggregate([
        { $group: { _id: "$paymentMethod", totalSales: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 } } },
      ]),

      Order.aggregate([
        {
          $facet: {
            currentMonth: [
              { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), $lte: new Date() } } },
              { $group: { _id: null, totalSales: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 } } },
            ],
            previousMonth: [
              { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), $lte: new Date(new Date().getFullYear(), new Date().getMonth(), 0) } } },
              { $group: { _id: null, totalSales: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 } } },
            ],
          },
        },
      ]),
    ]);

  const currentMonth  = monthlyComparison[0]?.currentMonth[0]  || { totalSales: 0, totalOrders: 0 };
  const previousMonth = monthlyComparison[0]?.previousMonth[0] || { totalSales: 0, totalOrders: 0 };

  const salesGrowth = previousMonth.totalSales > 0
    ? parseFloat((((currentMonth.totalSales - previousMonth.totalSales) / previousMonth.totalSales) * 100).toFixed(2))
    : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        salesByPeriod,
        salesByCategory,
        salesByPaymentMethod,
        monthlyComparison: {
          currentMonth,
          previousMonth,
          growth: { sales: salesGrowth },
        },
      },
      "Sales analytics fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get product analytics
// @route   GET /api/v1/analytics/products
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getProductAnalytics = asyncHandler(async (req, res) => {
  const [
    topSellingProducts,
    topRatedProducts,
    lowStockProducts,
    outOfStockProducts,
    productsByCategory,
    recentlyAdded,
  ] = await Promise.all([

    Product.find({ isActive: true }).sort({ sold: -1 }).limit(10)
      .select("name slug price sold stock ratings numReviews images").populate("category", "name"),

    Product.find({ isActive: true, numReviews: { $gt: 0 } }).sort({ ratings: -1, numReviews: -1 }).limit(10)
      .select("name slug price ratings numReviews sold images").populate("category", "name"),

    Product.find({ stock: { $lte: 10, $gt: 0 }, isActive: true }).sort({ stock: 1 }).limit(20)
      .select("name slug price stock sold images").populate("category", "name"),

    Product.find({ stock: 0, isActive: true }).sort({ sold: -1 }).limit(20)
      .select("name slug price stock sold images").populate("category", "name"),

    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", totalProducts: { $sum: 1 }, totalStock: { $sum: "$stock" }, totalSold: { $sum: "$sold" }, avgPrice: { $avg: "$price" }, avgRating: { $avg: "$ratings" } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $project: { categoryName: "$category.name", categorySlug: "$category.slug", totalProducts: 1, totalStock: 1, totalSold: 1, avgPrice: { $round: ["$avgPrice", 2] }, avgRating: { $round: ["$avgRating", 1] } } },
      { $sort: { totalSold: -1 } },
    ]),

    Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(5)
      .select("name slug price stock createdAt images").populate("category", "name"),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        topSellingProducts,
        topRatedProducts,
        lowStockProducts,
        outOfStockProducts,
        productsByCategory,
        recentlyAdded,
        summary: {
          lowStockCount:   lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
        },
      },
      "Product analytics fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get user analytics
// @route   GET /api/v1/analytics/users
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getUserAnalytics = asyncHandler(async (req, res) => {
  const [
    userGrowth,
    topCustomers,
    usersByRole,
    recentUsers,
    userRegistrationStats,
  ] = await Promise.all([

    User.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, newUsers: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]),

    Order.aggregate([
      { $group: { _id: "$user", totalSpent: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 }, avgOrder: { $avg: "$totalPrice" } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { name: "$user.name", email: "$user.email", totalSpent: { $round: ["$totalSpent", 2] }, totalOrders: 1, avgOrder: { $round: ["$avgOrder", 2] } } },
    ]),

    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),

    User.find().sort({ createdAt: -1 }).limit(5)
      .select("name email role createdAt isActive"),

    User.aggregate([
      {
        $facet: {
          today:     [{ $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }, { $count: "count" }],
          thisMonth: [{ $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }, { $count: "count" }],
          thisYear:  [{ $match: { createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } } }, { $count: "count" }],
        },
      },
    ]),
  ]);

  const regStats = userRegistrationStats[0];

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userGrowth:    userGrowth.reverse(),
        topCustomers,
        usersByRole,
        recentUsers,
        registrationStats: {
          today:     regStats.today[0]?.count     || 0,
          thisMonth: regStats.thisMonth[0]?.count || 0,
          thisYear:  regStats.thisYear[0]?.count  || 0,
        },
      },
      "User analytics fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get inventory analytics
// @route   GET /api/v1/analytics/inventory
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getInventoryAnalytics = asyncHandler(async (req, res) => {
  const [
    inventoryOverview,
    lowStockProducts,
    outOfStockProducts,
    inventoryByCategory,
    fastMovingProducts,
    slowMovingProducts,
  ] = await Promise.all([

    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id:            null,
          totalProducts:  { $sum: 1 },
          totalStock:     { $sum: "$stock" },
          totalSold:      { $sum: "$sold" },
          outOfStock:     { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
          lowStock:       { $sum: { $cond: [{ $and: [{ $lte: ["$stock", 10] }, { $gt: ["$stock", 0] }] }, 1, 0] } },
          healthyStock:   { $sum: { $cond: [{ $gt: ["$stock", 10] }, 1, 0] } },
          inventoryValue: { $sum: { $multiply: ["$price", "$stock"] } },
        },
      },
    ]),

    Product.find({ stock: { $lte: 10, $gt: 0 }, isActive: true }).sort({ stock: 1 }).limit(15)
      .select("name sku price stock sold images").populate("category", "name"),

    Product.find({ stock: 0, isActive: true }).sort({ sold: -1 }).limit(15)
      .select("name sku price stock sold images").populate("category", "name"),

    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", totalProducts: { $sum: 1 }, totalStock: { $sum: "$stock" }, totalSold: { $sum: "$sold" }, inventoryValue: { $sum: { $multiply: ["$price", "$stock"] } } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $project: { categoryName: "$category.name", totalProducts: 1, totalStock: 1, totalSold: 1, inventoryValue: { $round: ["$inventoryValue", 2] } } },
      { $sort: { inventoryValue: -1 } },
    ]),

    Product.find({ isActive: true, sold: { $gt: 0 } }).sort({ sold: -1 }).limit(10)
      .select("name price stock sold images").populate("category", "name"),

    Product.find({ isActive: true, stock: { $gt: 10 } }).sort({ sold: 1 }).limit(10)
      .select("name price stock sold images").populate("category", "name"),
  ]);

  const overview = inventoryOverview[0] || {
    totalProducts: 0, totalStock: 0, totalSold: 0,
    outOfStock: 0, lowStock: 0, healthyStock: 0, inventoryValue: 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: { ...overview, inventoryValue: parseFloat(overview.inventoryValue.toFixed(2)) },
        lowStockProducts,
        outOfStockProducts,
        inventoryByCategory,
        fastMovingProducts,
        slowMovingProducts,
      },
      "Inventory analytics fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get detailed sales report
// @route   GET /api/v1/analytics/sales/report
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getSalesReport = asyncHandler(async (req, res) => {
  const { period = "monthly", startDate = "", endDate = "" } = req.query;

  const matchFilter = {};
  if (startDate) matchFilter.createdAt = { ...matchFilter.createdAt, $gte: new Date(startDate) };
  if (endDate)   matchFilter.createdAt = { ...matchFilter.createdAt, $lte: new Date(endDate)   };

  const getGroupId = (period) => {
    switch (period) {
      case "daily":   return { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };
      case "weekly":  return { year: { $year: "$createdAt" }, week: { $week: "$createdAt" } };
      case "yearly":  return { year: { $year: "$createdAt" } };
      default:        return { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
    }
  };

  const [salesTrend, revenueByStatus, topProductsSold, salesByHour, averageMetrics] =
    await Promise.all([

      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: getGroupId(period), totalRevenue: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 }, avgOrderValue: { $avg: "$totalPrice" }, totalItems: { $sum: { $size: "$items" } } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),

      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$status", totalRevenue: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
      ]),

      Order.aggregate([
        { $match: matchFilter },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", productName: { $first: "$items.name" }, productImage: { $first: "$items.image" }, totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, totalQuantity: { $sum: "$items.quantity" }, totalOrders: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        { $project: { productName: 1, productImage: 1, totalRevenue: { $round: ["$totalRevenue", 2] }, totalQuantity: 1, totalOrders: 1 } },
      ]),

      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $hour: "$createdAt" }, totalOrders: { $sum: 1 }, totalRevenue: { $sum: "$totalPrice" } } },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, avgOrderValue: { $avg: "$totalPrice" }, avgItemsPerOrder: { $avg: { $size: "$items" } }, totalRevenue: { $sum: "$totalPrice" }, totalOrders: { $sum: 1 }, maxOrder: { $max: "$totalPrice" }, minOrder: { $min: "$totalPrice" } } },
      ]),
    ]);

  const metrics = averageMetrics[0] || { avgOrderValue: 0, avgItemsPerOrder: 0, totalRevenue: 0, totalOrders: 0, maxOrder: 0, minOrder: 0 };

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const found = salesByHour.find((s) => s._id === hour);
    return { hour, label: `${hour.toString().padStart(2, "0")}:00`, totalOrders: found?.totalOrders || 0, totalRevenue: found?.totalRevenue || 0 };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        salesTrend,
        revenueByStatus,
        topProductsSold,
        hourlyData,
        metrics: {
          avgOrderValue:    parseFloat(metrics.avgOrderValue.toFixed(2)),
          avgItemsPerOrder: parseFloat(metrics.avgItemsPerOrder.toFixed(1)),
          totalRevenue:     parseFloat(metrics.totalRevenue.toFixed(2)),
          totalOrders:      metrics.totalOrders,
          maxOrder:         parseFloat(metrics.maxOrder.toFixed(2)),
          minOrder:         parseFloat(metrics.minOrder.toFixed(2)),
        },
      },
      "Sales report fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get revenue comparison
// @route   GET /api/v1/analytics/sales/comparison
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getRevenueComparison = asyncHandler(async (req, res) => {
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  const [thisWeekVsLastWeek, thisMonthVsLastMonth, thisYearVsLastYear, last12Months] =
    await Promise.all([

      Order.aggregate([
        {
          $facet: {
            thisWeek: [
              { $match: { createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())) } } },
              { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
            ],
            lastWeek: [
              { $match: { createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 7)), $lte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())) } } },
              { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
            ],
          },
        },
      ]),

      Order.aggregate([
        {
          $facet: {
            thisMonth: [
              { $match: { createdAt: { $gte: new Date(currentYear, currentMonth, 1), $lte: new Date() } } },
              { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
            ],
            lastMonth: [
              { $match: { createdAt: { $gte: new Date(currentYear, currentMonth - 1, 1), $lte: new Date(currentYear, currentMonth, 0) } } },
              { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
            ],
          },
        },
      ]),

      Order.aggregate([
        {
          $facet: {
            thisYear: [
              { $match: { createdAt: { $gte: new Date(currentYear, 0, 1), $lte: new Date() } } },
              { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
            ],
            lastYear: [
              { $match: { createdAt: { $gte: new Date(currentYear - 1, 0, 1), $lte: new Date(currentYear - 1, 11, 31) } } },
              { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
            ],
          },
        },
      ]),

      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

  const calcGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  };

  const thisWeek  = thisWeekVsLastWeek[0]?.thisWeek[0]    || { revenue: 0, orders: 0 };
  const lastWeek  = thisWeekVsLastWeek[0]?.lastWeek[0]    || { revenue: 0, orders: 0 };
  const thisMonth = thisMonthVsLastMonth[0]?.thisMonth[0] || { revenue: 0, orders: 0 };
  const lastMonth = thisMonthVsLastMonth[0]?.lastMonth[0] || { revenue: 0, orders: 0 };
  const thisYear  = thisYearVsLastYear[0]?.thisYear[0]    || { revenue: 0, orders: 0 };
  const lastYear  = thisYearVsLastYear[0]?.lastYear[0]    || { revenue: 0, orders: 0 };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comparison: {
          weekly:  { thisWeek,  lastWeek,  revenueGrowth: calcGrowth(thisWeek.revenue,  lastWeek.revenue),  ordersGrowth: calcGrowth(thisWeek.orders,  lastWeek.orders)  },
          monthly: { thisMonth, lastMonth, revenueGrowth: calcGrowth(thisMonth.revenue, lastMonth.revenue), ordersGrowth: calcGrowth(thisMonth.orders, lastMonth.orders) },
          yearly:  { thisYear,  lastYear,  revenueGrowth: calcGrowth(thisYear.revenue,  lastYear.revenue),  ordersGrowth: calcGrowth(thisYear.orders,  lastYear.orders)  },
        },
        last12Months,
      },
      "Revenue comparison fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get category sales performance
// @route   GET /api/v1/analytics/sales/categories
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getCategorySalesPerformance = asyncHandler(async (req, res) => {
  const { startDate = "", endDate = "", limit = 10 } = req.query;

  const matchFilter = {};
  if (startDate) matchFilter.createdAt = { ...matchFilter.createdAt, $gte: new Date(startDate) };
  if (endDate)   matchFilter.createdAt = { ...matchFilter.createdAt, $lte: new Date(endDate)   };

  const categoryPerformance = await Order.aggregate([
    { $match: matchFilter },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "categories", localField: "product.category", foreignField: "_id", as: "category" } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $group: { _id: "$category._id", categoryName: { $first: "$category.name" }, categorySlug: { $first: "$category.slug" }, totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, totalQuantity: { $sum: "$items.quantity" }, uniqueProducts: { $addToSet: "$items.product" } } },
    { $project: { categoryName: 1, categorySlug: 1, totalRevenue: { $round: ["$totalRevenue", 2] }, totalQuantity: 1, uniqueProducts: { $size: "$uniqueProducts" } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: parseInt(limit) },
  ]);

  const totalRevenue = categoryPerformance.reduce((sum, cat) => sum + cat.totalRevenue, 0);

  const categoriesWithPercentage = categoryPerformance.map((cat) => ({
    ...cat,
    revenuePercentage: totalRevenue > 0
      ? parseFloat(((cat.totalRevenue / totalRevenue) * 100).toFixed(2))
      : 0,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        categories:      categoriesWithPercentage,
        totalRevenue:    parseFloat(totalRevenue.toFixed(2)),
        totalCategories: categoriesWithPercentage.length,
      },
      "Category sales performance fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Export sales data
// @route   GET /api/v1/analytics/sales/export
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const exportSalesData = asyncHandler(async (req, res) => {
  const { startDate = "", endDate = "", format = "json" } = req.query;

  const matchFilter = {};
  if (startDate) matchFilter.createdAt = { ...matchFilter.createdAt, $gte: new Date(startDate) };
  if (endDate)   matchFilter.createdAt = { ...matchFilter.createdAt, $lte: new Date(endDate)   };

  const orders = await Order.find(matchFilter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .select("orderNumber status paymentMethod paymentStatus itemsPrice shippingPrice taxPrice totalPrice isPaid paidAt isDelivered deliveredAt createdAt user items");

  const exportData = orders.map((order) => ({
    orderNumber:   order.orderNumber,
    date:          order.createdAt.toISOString().split("T")[0],
    customerName:  order.user?.name  || "N/A",
    customerEmail: order.user?.email || "N/A",
    status:        order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    itemsPrice:    order.itemsPrice,
    shippingPrice: order.shippingPrice,
    taxPrice:      order.taxPrice,
    totalPrice:    order.totalPrice,
    isPaid:        order.isPaid,
    isDelivered:   order.isDelivered,
    itemCount:     order.items.length,
  }));

  if (format === "csv") {
    const headers = Object.keys(exportData[0] || {}).join(",");
    const rows    = exportData.map((row) => Object.values(row).map((val) => `"${val}"`).join(","));
    const csv     = [headers, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=sales-export-${Date.now()}.csv`);
    return res.send(csv);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { data: exportData, totalOrders: exportData.length, exportDate: new Date().toISOString() },
      "Sales data exported successfully"
    )
  );
});