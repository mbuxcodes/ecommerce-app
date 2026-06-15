import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Product from "../models/Product.model.js";
import Order from "../models/Order.model.js";
import { PAGINATION } from "../constants/index.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get inventory list with filters
// @route   GET /api/v1/inventory
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getInventory = asyncHandler(async (req, res) => {
  const {
    page      = PAGINATION.DEFAULT_PAGE,
    limit     = PAGINATION.DEFAULT_LIMIT,
    search    = "",
    category  = "",
    stockStatus = "", // "in_stock" | "low_stock" | "out_of_stock"
    sortBy    = "stock",
    order     = "asc",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  // ─── Build Filter ──────────────────────────────────────────
  const filter = { isActive: true };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku:  { $regex: search, $options: "i" } },
    ];
  }

  if (category) filter.category = category;

  /*
  STOCK STATUS FILTER:
    in_stock    → stock > 10
    low_stock   → stock 1-10
    out_of_stock → stock = 0
  */
  switch (stockStatus) {
    case "in_stock":
      filter.stock = { $gt: 10 };
      break;
    case "low_stock":
      filter.stock = { $lte: 10, $gt: 0 };
      break;
    case "out_of_stock":
      filter.stock = 0;
      break;
  }

  const sortOrder = order === "desc" ? -1 : 1;
  const sort      = { [sortBy]: sortOrder };

  const [products, totalProducts] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("name slug sku price stock sold ratings images isActive isFeatured category createdAt"),
    Product.countDocuments(filter),
  ]);

  // ─── Add Stock Status to Each Product ─────────────────────
  const inventory = products.map((product) => ({
    ...product.toObject(),
    stockStatus: product.stock === 0
      ? "out_of_stock"
      : product.stock <= 10
        ? "low_stock"
        : "in_stock",
    stockValue: parseFloat((product.price * product.stock).toFixed(2)),
  }));

  // ─── Summary Stats ─────────────────────────────────────────
  const [summaryStats] = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id:             null,
        totalProducts:   { $sum: 1 },
        totalStock:      { $sum: "$stock" },
        totalSold:       { $sum: "$sold"  },
        outOfStock:      { $sum: { $cond: [{ $eq:  ["$stock", 0]               }, 1, 0] } },
        lowStock:        { $sum: { $cond: [{ $and: [{ $lte: ["$stock", 10] }, { $gt: ["$stock", 0] }] }, 1, 0] } },
        inStock:         { $sum: { $cond: [{ $gt:  ["$stock", 10]              }, 1, 0] } },
        totalStockValue: { $sum: { $multiply: ["$price", "$stock"] } },
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        inventory,
        pagination: {
          currentPage:   pageNum,
          totalPages:    Math.ceil(totalProducts / limitNum),
          totalProducts,
          limit:         limitNum,
          hasNextPage:   pageNum < Math.ceil(totalProducts / limitNum),
          hasPrevPage:   pageNum > 1,
        },
        summary: summaryStats || {
          totalProducts:   0,
          totalStock:      0,
          outOfStock:      0,
          lowStock:        0,
          inStock:         0,
          totalStockValue: 0,
        },
      },
      "Inventory fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update single product stock
// @route   PUT /api/v1/inventory/:id/stock
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateStock = asyncHandler(async (req, res) => {
  const { stock, operation = "set", note = "" } = req.body;
  /*
  OPERATIONS:
    set       → Set stock to exact value
    increment → Add to existing stock
    decrement → Remove from existing stock
  */

  if (stock === undefined || stock < 0) {
    throw new ApiError(400, "Valid stock quantity is required");
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const previousStock = product.stock;

  switch (operation) {
    case "set":
      product.stock = parseInt(stock);
      break;
    case "increment":
      product.stock += parseInt(stock);
      break;
    case "decrement":
      if (product.stock - parseInt(stock) < 0) {
        throw new ApiError(
          400,
          `Cannot decrement. Current stock is ${product.stock}, trying to remove ${stock}`
        );
      }
      product.stock -= parseInt(stock);
      break;
    default:
      throw new ApiError(400, "Invalid operation. Use set, increment, or decrement");
  }

  await product.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        product: {
          _id:           product._id,
          name:          product.name,
          sku:           product.sku,
          previousStock,
          currentStock:  product.stock,
          operation,
          change:        product.stock - previousStock,
          stockStatus:   product.stock === 0 ? "out_of_stock" : product.stock <= 10 ? "low_stock" : "in_stock",
          note,
        },
      },
      `Stock ${operation === "set" ? "updated" : operation + "ed"} successfully`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Bulk stock update
// @route   PUT /api/v1/inventory/bulk-stock
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const bulkUpdateStock = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  /*
  EXPECTED BODY:
  {
    "updates": [
      { "productId": "xxx", "stock": 100, "operation": "set" },
      { "productId": "yyy", "stock": 50,  "operation": "increment" },
      { "productId": "zzz", "stock": 10,  "operation": "decrement" }
    ]
  }
  */

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, "Updates array is required");
  }

  if (updates.length > 50) {
    throw new ApiError(400, "Cannot update more than 50 products at once");
  }

  const results  = [];
  const errors   = [];

  // Process each update
  for (const update of updates) {
    const { productId, stock, operation = "set" } = update;

    if (!productId || stock === undefined || stock < 0) {
      errors.push({ productId, error: "Invalid productId or stock value" });
      continue;
    }

    try {
      const product = await Product.findById(productId);

      if (!product) {
        errors.push({ productId, error: "Product not found" });
        continue;
      }

      const previousStock = product.stock;

      switch (operation) {
        case "set":
          product.stock = parseInt(stock);
          break;
        case "increment":
          product.stock += parseInt(stock);
          break;
        case "decrement":
          if (product.stock - parseInt(stock) < 0) {
            errors.push({
              productId,
              error: `Cannot decrement. Current stock: ${product.stock}`,
            });
            continue;
          }
          product.stock -= parseInt(stock);
          break;
        default:
          errors.push({ productId, error: `Invalid operation: ${operation}` });
          continue;
      }

      await product.save({ validateBeforeSave: false });

      results.push({
        productId,
        name:          product.name,
        previousStock,
        currentStock:  product.stock,
        operation,
        stockStatus:   product.stock === 0
          ? "out_of_stock"
          : product.stock <= 10
            ? "low_stock"
            : "in_stock",
      });
    } catch (err) {
      errors.push({ productId, error: err.message });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        updated:       results.length,
        failed:        errors.length,
        results,
        errors,
      },
      `Bulk update complete. ${results.length} updated, ${errors.length} failed.`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get low stock products
// @route   GET /api/v1/inventory/low-stock
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold = 10 } = req.query;

  const products = await Product.find({
    stock:    { $lte: parseInt(threshold), $gt: 0 },
    isActive: true,
  })
    .populate("category", "name slug")
    .sort({ stock: 1 })
    .select("name slug sku price stock sold images category");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        total:     products.length,
        threshold: parseInt(threshold),
        message:   products.length > 0
          ? `${products.length} product(s) running low on stock`
          : "No low stock products",
      },
      "Low stock products fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get out of stock products
// @route   GET /api/v1/inventory/out-of-stock
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getOutOfStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    stock:    0,
    isActive: true,
  })
    .populate("category", "name slug")
    .sort({ sold: -1 })
    .select("name slug sku price stock sold images category");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        total:   products.length,
        message: products.length > 0
          ? `${products.length} product(s) are out of stock`
          : "No out of stock products",
      },
      "Out of stock products fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Restock multiple products at once
// @route   POST /api/v1/inventory/restock
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const restockProducts = asyncHandler(async (req, res) => {
  const { products: restockList, defaultQuantity = 100 } = req.body;
  /*
  EXPECTED BODY:
  {
    "products": [
      { "productId": "xxx", "quantity": 50  },
      { "productId": "yyy", "quantity": 100 }
    ],
    "defaultQuantity": 100
  }

  If no products array provided → restock ALL out-of-stock products
  with defaultQuantity
  */

  let productsToRestock = [];

  if (restockList && restockList.length > 0) {
    // Restock specific products
    productsToRestock = restockList;
  } else {
    // Auto-restock all out-of-stock products
    const outOfStockProducts = await Product.find({
      stock:    0,
      isActive: true,
    }).select("_id name");

    productsToRestock = outOfStockProducts.map((p) => ({
      productId: p._id.toString(),
      quantity:  defaultQuantity,
    }));
  }

  if (productsToRestock.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, { restocked: [] }, "No products need restocking")
    );
  }

  const restocked = [];
  const errors    = [];

  for (const item of productsToRestock) {
    try {
      const product = await Product.findById(item.productId);

      if (!product) {
        errors.push({ productId: item.productId, error: "Product not found" });
        continue;
      }

      const previousStock  = product.stock;
      product.stock       += parseInt(item.quantity || defaultQuantity);

      await product.save({ validateBeforeSave: false });

      restocked.push({
        productId:     product._id,
        name:          product.name,
        sku:           product.sku || "N/A",
        previousStock,
        addedStock:    parseInt(item.quantity || defaultQuantity),
        currentStock:  product.stock,
        stockStatus:   "in_stock",
      });
    } catch (err) {
      errors.push({ productId: item.productId, error: err.message });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        restocked:       restocked.length,
        failed:          errors.length,
        products:        restocked,
        errors,
      },
      `Restock complete. ${restocked.length} product(s) restocked successfully.`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get full inventory report
// @route   GET /api/v1/inventory/report
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getInventoryReport = asyncHandler(async (req, res) => {
  const [
    overallStats,
    categoryBreakdown,
    mostSoldProducts,
    neverSoldProducts,
    stockValueByCategory,
    recentlyRestocked,
  ] = await Promise.all([

    // 1. Overall inventory stats
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id:             null,
          totalProducts:   { $sum: 1 },
          totalStock:      { $sum: "$stock" },
          totalSold:       { $sum: "$sold"  },
          outOfStock:      { $sum: { $cond: [{ $eq:  ["$stock", 0]  }, 1, 0] } },
          lowStock:        { $sum: { $cond: [{ $and: [{ $lte: ["$stock", 10] }, { $gt: ["$stock", 0] }] }, 1, 0] } },
          healthyStock:    { $sum: { $cond: [{ $gt:  ["$stock", 10] }, 1, 0] } },
          totalStockValue: { $sum: { $multiply: ["$price", "$stock"] } },
          avgStockLevel:   { $avg: "$stock" },
          maxStock:        { $max: "$stock" },
          minStock:        { $min: "$stock" },
        },
      },
    ]),

    // 2. Category breakdown
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id:            "$category",
          totalProducts:  { $sum: 1 },
          totalStock:     { $sum: "$stock"  },
          totalSold:      { $sum: "$sold"   },
          stockValue:     { $sum: { $multiply: ["$price", "$stock"] } },
          outOfStock:     { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
          lowStock:       { $sum: { $cond: [{ $and: [{ $lte: ["$stock", 10] }, { $gt: ["$stock", 0] }] }, 1, 0] } },
        },
      },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          categoryName:  "$category.name",
          totalProducts: 1,
          totalStock:    1,
          totalSold:     1,
          stockValue:    { $round: ["$stockValue", 2] },
          outOfStock:    1,
          lowStock:      1,
        },
      },
      { $sort: { stockValue: -1 } },
    ]),

    // 3. Most sold products
    Product.find({ isActive: true, sold: { $gt: 0 } })
      .sort({ sold: -1 })
      .limit(10)
      .select("name sku price stock sold images")
      .populate("category", "name"),

    // 4. Never sold products
    Product.find({ isActive: true, sold: 0 })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name sku price stock sold createdAt images")
      .populate("category", "name"),

    // 5. Stock value by category
    Product.aggregate([
      { $match: { isActive: true, stock: { $gt: 0 } } },
      {
        $group: {
          _id:        "$category",
          stockValue: { $sum: { $multiply: ["$price", "$stock"] } },
        },
      },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $project: { categoryName: "$category.name", stockValue: { $round: ["$stockValue", 2] } } },
      { $sort: { stockValue: -1 } },
    ]),

    // 6. Recently restocked (updated in last 7 days, stock > 0)
    Product.find({
      isActive:  true,
      stock:     { $gt: 0 },
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("name sku price stock updatedAt images")
      .populate("category", "name"),
  ]);

  const stats = overallStats[0] || {
    totalProducts:   0,
    totalStock:      0,
    totalSold:       0,
    outOfStock:      0,
    lowStock:        0,
    healthyStock:    0,
    totalStockValue: 0,
    avgStockLevel:   0,
    maxStock:        0,
    minStock:        0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: {
          ...stats,
          totalStockValue: parseFloat(stats.totalStockValue.toFixed(2)),
          avgStockLevel:   parseFloat(stats.avgStockLevel.toFixed(1)),
        },
        categoryBreakdown,
        mostSoldProducts,
        neverSoldProducts,
        stockValueByCategory,
        recentlyRestocked,
        generatedAt: new Date().toISOString(),
      },
      "Inventory report generated successfully"
    )
  );
});