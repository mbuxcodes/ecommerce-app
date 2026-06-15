import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Product from "../models/Product.model.js";
import Category from "../models/Category.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/uploadToCloudinary.js";
import { PAGINATION } from "../constants/index.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get all products (with filters, search, pagination)
// @route   GET /api/v1/products
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page       = PAGINATION.DEFAULT_PAGE,
    limit      = PAGINATION.DEFAULT_LIMIT,
    search     = "",
    category   = "",
    minPrice   = "",
    maxPrice   = "",
    minRating  = "",
    sortBy     = "createdAt",
    order      = "desc",
    isFeatured = "",
    inStock    = "",
    tags       = "",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  // ─── Build Filter ─────────────────────────────────────────────
  const filter = { isActive: true };

  // Full-text search
  if (search) {
    filter.$text = { $search: search };
    /*
    $text search uses our text index:
    productSchema.index({ name: "text", description: "text", tags: "text" })
    This searches across name, description, and tags simultaneously
    */
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Rating filter
  if (minRating) {
    filter.ratings = { $gte: parseFloat(minRating) };
  }

  // Featured filter
  if (isFeatured) {
    filter.isFeatured = isFeatured === "true";
  }

  // In stock filter
  if (inStock === "true") {
    filter.stock = { $gt: 0 };
  }

  // Tags filter
  if (tags) {
    const tagsArray = tags.split(",").map((t) => t.trim());
    filter.tags = { $in: tagsArray };
  }

  // ─── Build Sort ───────────────────────────────────────────────
  const sortOrder = order === "asc" ? 1 : -1;
  let sort        = { [sortBy]: sortOrder };

  // Special handling for text search score
  if (search) {
    sort = { score: { $meta: "textScore" }, ...sort };
  }

  // ─── Execute Query ────────────────────────────────────────────
  const [products, totalProducts] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v"),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalProducts / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          limit:       limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
      "Products fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get single product by slug
// @route   GET /api/v1/products/:slug
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug:     req.params.slug,
    isActive: true,
  })
    .populate("category", "name slug")
    .select("-__v");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { product }, "Product fetched successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get single product by ID (Admin)
// @route   GET /api/v1/products/id/:id
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "name slug")
    .select("-__v");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { product }, "Product fetched successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Create new product
// @route   POST /api/v1/products
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    comparePrice,
    category,
    stock,
    tags,
    attributes,
    sku,
    isFeatured,
    isActive,
  } = req.body;

  // 1. Verify category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ApiError(404, "Category not found");
  }

  // 2. Check SKU uniqueness if provided
  if (sku) {
    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
      throw new ApiError(409, "Product with this SKU already exists");
    }
  }

  // 3. Build product data
  const productData = {
    name,
    description,
    shortDescription: shortDescription || "",
    price:            parseFloat(price),
    comparePrice:     comparePrice ? parseFloat(comparePrice) : 0,
    category,
    stock:            parseInt(stock),
    tags:             tags || [],
    isFeatured:       isFeatured || false,
    isActive:         isActive !== undefined ? isActive : true,
  };

  if (sku)        productData.sku        = sku;
  if (attributes) productData.attributes = attributes;

  // 4. Handle multiple image uploads
  if (req.files && req.files.length > 0) {
    const uploadedImages = [];

    for (let i = 0; i < req.files.length; i++) {
      const uploaded = await uploadToCloudinary(
        req.files[i].path,
        "ecommerce/products"
      );

      if (uploaded) {
        uploadedImages.push({
          url:      uploaded.url,
          publicId: uploaded.publicId,
          isMain:   i === 0, // First image is main image
        });
      }
    }

    productData.images = uploadedImages;
  }

  // 5. Create product — slug auto-generated by pre-save hook
  const product = await Product.create(productData);

  // 6. Update category product count
  await Category.findByIdAndUpdate(category, {
    $inc: { productCount: 1 },
  });

  // 7. Populate category before sending response
  await product.populate("category", "name slug");

  return res.status(201).json(
    new ApiResponse(201, { product }, "Product created successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const {
    name,
    description,
    shortDescription,
    price,
    comparePrice,
    category,
    stock,
    tags,
    attributes,
    sku,
    isFeatured,
    isActive,
  } = req.body;

  // If category is being changed, verify new category exists
  if (category && category !== product.category.toString()) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new ApiError(404, "Category not found");
    }

    // Update product counts
    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: -1 },
    });
    await Category.findByIdAndUpdate(category, {
      $inc: { productCount: 1 },
    });
  }

  // Update only provided fields
  if (name             !== undefined) product.name             = name;
  if (description      !== undefined) product.description      = description;
  if (shortDescription !== undefined) product.shortDescription = shortDescription;
  if (price            !== undefined) product.price            = parseFloat(price);
  if (comparePrice     !== undefined) product.comparePrice     = parseFloat(comparePrice);
  if (category         !== undefined) product.category         = category;
  if (stock            !== undefined) product.stock            = parseInt(stock);
  if (tags             !== undefined) product.tags             = tags;
  if (attributes       !== undefined) product.attributes       = attributes;
  if (sku              !== undefined) product.sku              = sku;
  if (isFeatured       !== undefined) product.isFeatured       = isFeatured;
  if (isActive         !== undefined) product.isActive         = isActive;

  await product.save();
  await product.populate("category", "name slug");

  return res.status(200).json(
    new ApiResponse(200, { product }, "Product updated successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // 1. Delete all product images from Cloudinary
  if (product.images && product.images.length > 0) {
    for (const image of product.images) {
      if (image.publicId) {
        await deleteFromCloudinary(image.publicId);
      }
    }
  }

  // 2. Update category product count
  await Category.findByIdAndUpdate(product.category, {
    $inc: { productCount: -1 },
  });

  // 3. Delete product
  await Product.findByIdAndDelete(req.params.id);

  return res.status(200).json(
    new ApiResponse(200, {}, "Product deleted successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Upload product images
// @route   POST /api/v1/products/:id/images
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const uploadProductImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "Please upload at least one image");
  }

  // Check total images limit
  const totalImages = product.images.length + req.files.length;
  if (totalImages > 10) {
    throw new ApiError(
      400,
      `Cannot upload. Product already has ${product.images.length} image(s). Maximum 10 images allowed.`
    );
  }

  // Upload all new images to Cloudinary
  const uploadedImages = [];

  for (const file of req.files) {
    const uploaded = await uploadToCloudinary(
      file.path,
      "ecommerce/products"
    );

    if (uploaded) {
      uploadedImages.push({
        url:      uploaded.url,
        publicId: uploaded.publicId,
        isMain:   product.images.length === 0 && uploadedImages.length === 0,
        // First image becomes main if no images exist
      });
    }
  }

  // Add new images to product
  product.images.push(...uploadedImages);
  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { images: product.images },
      "Images uploaded successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Delete single product image
// @route   DELETE /api/v1/products/:id/images/:imageId
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const deleteProductImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Find the image in product's images array
  const imageIndex = product.images.findIndex(
    (img) => img._id.toString() === imageId
  );

  if (imageIndex === -1) {
    throw new ApiError(404, "Image not found");
  }

  const image = product.images[imageIndex];

  // Delete from Cloudinary
  if (image.publicId) {
    await deleteFromCloudinary(image.publicId);
  }

  // Remove from product images array
  product.images.splice(imageIndex, 1);

  // If deleted image was main, set first remaining as main
  if (image.isMain && product.images.length > 0) {
    product.images[0].isMain = true;
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { images: product.images },
      "Image deleted successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Set main product image
// @route   PUT /api/v1/products/:id/images/:imageId/main
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const setMainImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Set all images isMain to false
  product.images.forEach((img) => {
    img.isMain = img._id.toString() === imageId;
  });

  const mainImage = product.images.find(
    (img) => img._id.toString() === imageId
  );

  if (!mainImage) {
    throw new ApiError(404, "Image not found");
  }

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { images: product.images },
      "Main image updated successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({
    isFeatured: true,
    isActive:   true,
    stock:      { $gt: 0 },
  })
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select("-__v");

  return res.status(200).json(
    new ApiResponse(
      200,
      { products },
      "Featured products fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get related products
// @route   GET /api/v1/products/:id/related
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id:      { $ne: product._id }, // Exclude current product
    isActive: true,
    stock:    { $gt: 0 },
  })
    .populate("category", "name slug")
    .sort({ ratings: -1 })
    .limit(8)
    .select("-__v");

  return res.status(200).json(
    new ApiResponse(
      200,
      { products: relatedProducts },
      "Related products fetched successfully"
    )
  );
});