import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Product from "../models/Product.model.js";
import Category from "../models/Category.model.js";
import { PAGINATION } from "../constants/index.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Advanced product search with filters
// @route   GET /api/v1/search
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const searchProducts = asyncHandler(async (req, res) => {
  const {
    q          = "",       // Search query
    category   = "",       // Category ID or slug
    minPrice   = "",       // Minimum price
    maxPrice   = "",       // Maximum price
    minRating  = "",       // Minimum rating
    inStock    = "",       // In stock only
    isFeatured = "",       // Featured only
    tags       = "",       // Comma separated tags
    sortBy     = "relevance", // Sort field
    order      = "desc",   // Sort order
    page       = PAGINATION.DEFAULT_PAGE,
    limit      = PAGINATION.DEFAULT_LIMIT,
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  // ─── Build Filter ──────────────────────────────────────────
  const filter = { isActive: true };

  // ─── Text Search ───────────────────────────────────────────
  if (q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  // ─── Category Filter ───────────────────────────────────────
  if (category) {
    /*
    Category can be either:
    1. MongoDB ObjectId → direct filter
    2. Slug string      → find category first, then filter
    */
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(category);

    if (isMongoId) {
      filter.category = category;
    } else {
      // Find category by slug
      const categoryDoc = await Category.findOne({
        slug:     category,
        isActive: true,
      });

      if (categoryDoc) {
        /*
        Find products in this category AND all subcategories:
        1. Find all subcategory IDs under this category
        2. Filter products by category OR subcategory
        */
        const subcategories = await Category.find({
          parent: categoryDoc._id,
        }).select("_id");

        const categoryIds = [
          categoryDoc._id,
          ...subcategories.map((s) => s._id),
        ];

        filter.category = { $in: categoryIds };
      }
    }
  }

  // ─── Price Range Filter ────────────────────────────────────
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // ─── Rating Filter ─────────────────────────────────────────
  if (minRating) {
    filter.ratings = { $gte: parseFloat(minRating) };
  }

  // ─── Stock Filter ──────────────────────────────────────────
  if (inStock === "true") {
    filter.stock = { $gt: 0 };
  }

  // ─── Featured Filter ───────────────────────────────────────
  if (isFeatured === "true") {
    filter.isFeatured = true;
  }

  // ─── Tags Filter ───────────────────────────────────────────
  if (tags) {
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (tagsArray.length > 0) {
      filter.tags = { $in: tagsArray };
    }
  }

  // ─── Build Sort ────────────────────────────────────────────
  /*
  SORT OPTIONS:
    relevance  → Text search score (only when q is provided)
    price      → Price low to high or high to low
    rating     → Highest rated first
    newest     → Most recently added
    popular    → Most sold
    name       → Alphabetical
  */
  let sort = {};

  switch (sortBy) {
    case "relevance":
      if (q.trim()) {
        sort = { score: { $meta: "textScore" }, createdAt: -1 };
      } else {
        sort = { createdAt: -1 };
      }
      break;
    case "price":
      sort = { price: order === "asc" ? 1 : -1 };
      break;
    case "rating":
      sort = { ratings: -1, numReviews: -1 };
      break;
    case "newest":
      sort = { createdAt: -1 };
      break;
    case "popular":
      sort = { sold: -1 };
      break;
    case "name":
      sort = { name: order === "asc" ? 1 : -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  // ─── Execute Query ─────────────────────────────────────────
  /*
  Run both queries in parallel using Promise.all
  for better performance instead of sequential:
    Sequential:  query1 (200ms) + query2 (200ms) = 400ms
    Parallel:    max(query1, query2) = 200ms
  */
  const selectFields = q.trim() && sortBy === "relevance"
    ? { score: { $meta: "textScore" } }
    : {};

  const [products, totalProducts] = await Promise.all([
    Product.find(filter, selectFields)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalProducts / limitNum);

  // ─── Build Applied Filters Summary ─────────────────────────
  /*
  Return a summary of what filters were applied.
  Useful for frontend to show "Active Filters" chips.
  */
  const appliedFilters = {};
  if (q)          appliedFilters.search     = q;
  if (category)   appliedFilters.category   = category;
  if (minPrice)   appliedFilters.minPrice   = parseFloat(minPrice);
  if (maxPrice)   appliedFilters.maxPrice   = parseFloat(maxPrice);
  if (minRating)  appliedFilters.minRating  = parseFloat(minRating);
  if (inStock)    appliedFilters.inStock    = inStock === "true";
  if (isFeatured) appliedFilters.isFeatured = isFeatured === "true";
  if (tags)       appliedFilters.tags       = tags.split(",").map(t => t.trim());

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          currentPage:   pageNum,
          totalPages,
          totalProducts,
          limit:         limitNum,
          hasNextPage:   pageNum < totalPages,
          hasPrevPage:   pageNum > 1,
        },
        appliedFilters,
        sortBy,
        order,
      },
      `Found ${totalProducts} product(s)`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get search suggestions (autocomplete)
// @route   GET /api/v1/search/suggestions
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q = "" } = req.query;

  if (!q.trim() || q.trim().length < 2) {
    return res.status(200).json(
      new ApiResponse(200, { suggestions: [] }, "No suggestions")
    );
  }

  /*
  AUTOCOMPLETE STRATEGY:
    1. Search product names starting with query (prefix match)
    2. Search product tags matching query
    3. Search category names matching query
    4. Combine and deduplicate results
    5. Return max 10 suggestions
  */

  const searchRegex = new RegExp(q.trim(), "i");
  // "i" flag = case insensitive
  // Matches: "iphone", "iPhone", "IPHONE" all match query "iph"

  const [products, categories] = await Promise.all([
    Product.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { tags: { $in: [searchRegex] } },
      ],
    })
      .select("name slug images price")
      .limit(6),

    Category.find({
      isActive: true,
      name:     searchRegex,
    })
      .select("name slug")
      .limit(4),
  ]);

  // Build suggestions list
  const suggestions = [
    // Product suggestions
    ...products.map((p) => ({
      type:  "product",
      name:  p.name,
      slug:  p.slug,
      price: p.price,
      image: p.images?.[0]?.url || "",
    })),

    // Category suggestions
    ...categories.map((c) => ({
      type: "category",
      name: c.name,
      slug: c.slug,
    })),
  ];

  return res.status(200).json(
    new ApiResponse(
      200,
      { suggestions },
      "Suggestions fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get available filters for search results
// @route   GET /api/v1/search/filters
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAvailableFilters = asyncHandler(async (req, res) => {
  const { category = "" } = req.query;

  // Base filter — only active products
  const baseFilter = { isActive: true };
  if (category) baseFilter.category = category;

  /*
  AGGREGATION PIPELINE:
    Run multiple aggregations in parallel to get:
    1. Price range (min and max)
    2. Available categories with product counts
    3. Available tags with counts
    4. Rating distribution
  */

  const [
    priceRange,
    categories,
    tags,
    ratingDistribution,
  ] = await Promise.all([

    // 1. Price Range
    Product.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id:      null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]),

    // 2. Categories with product counts
    Product.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id:   "$category",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from:         "categories",
          localField:   "_id",
          foreignField: "_id",
          as:           "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id:   "$category._id",
          name:  "$category.name",
          slug:  "$category.slug",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 3. Tags with counts
    Product.aggregate([
      { $match: baseFilter },
      { $unwind: "$tags" },
      {
        $group: {
          _id:   "$tags",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          tag:   "$_id",
          count: 1,
          _id:   0,
        },
      },
    ]),

    // 4. Rating Distribution
    Product.aggregate([
      { $match: { ...baseFilter, numReviews: { $gt: 0 } } },
      {
        $group: {
          _id:   { $floor: "$ratings" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]),
  ]);

  // Format price range
  const price = priceRange[0]
    ? {
        min: Math.floor(priceRange[0].minPrice),
        max: Math.ceil(priceRange[0].maxPrice),
        avg: Math.round(priceRange[0].avgPrice),
      }
    : { min: 0, max: 0, avg: 0 };

  // Format rating distribution
  const ratings = ratingDistribution.map((r) => ({
    rating: r._id,
    count:  r.count,
    label:  `${r._id}★ & above`,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        filters: {
          price,
          categories,
          tags,
          ratings,
        },
      },
      "Filters fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get trending / popular products
// @route   GET /api/v1/search/trending
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getTrendingProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const products = await Product.aggregate([
    {
      $match: {
        isActive: true,
        stock:    { $gt: 0 },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ["$sold",       0.5] },
            { $multiply: ["$ratings",    10 ] },
            { $multiply: ["$numReviews", 0.3] },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from:         "categories",
        localField:   "category",
        foreignField: "_id",
        as:           "category",
      },
    },
    // ✅ Fixed: preserveNullAndEmptyArrays (not preserveNullAndEmpty)
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name:          1,
        slug:          1,
        price:         1,
        comparePrice:  1,
        images:        1,
        ratings:       1,
        numReviews:    1,
        sold:          1,
        stock:         1,
        isFeatured:    1,
        trendingScore: 1,
        category: {
          name: "$category.name",
          slug: "$category.slug",
        },
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { products },
      "Trending products fetched successfully"
    )
  );
});