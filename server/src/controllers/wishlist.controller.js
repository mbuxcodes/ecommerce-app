import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Wishlist from "../models/Wishlist.model.js";
import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get user wishlist
// @route   GET /api/v1/wishlist
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({
    user: req.user._id,
  }).populate({
    path:   "products",
    select: "name slug price comparePrice images stock ratings numReviews isActive isFeatured",
    /*
    We populate all product details so frontend
    can display the wishlist like a product grid.
    */
  });

  // If no wishlist exists, return empty
  if (!wishlist) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          wishlist: {
            products:   [],
            totalItems: 0,
          },
        },
        "Wishlist is empty"
      )
    );
  }

  /*
  CLEANUP: Remove inactive or deleted products
  from wishlist automatically when fetching.
  */
  const originalLength = wishlist.products.length;

  wishlist.products = wishlist.products.filter(
    (product) => product && product.isActive
  );

  // Save if any products were removed
  if (wishlist.products.length !== originalLength) {
    await wishlist.save();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        wishlist: {
          _id:        wishlist._id,
          products:   wishlist.products,
          totalItems: wishlist.totalItems,
        },
      },
      "Wishlist fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Add product to wishlist
// @route   POST /api/v1/wishlist
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  // 1. Verify product exists and is active
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.isActive) {
    throw new ApiError(400, "Product is no longer available");
  }

  // 2. Find or create wishlist
  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = new Wishlist({
      user:     req.user._id,
      products: [],
    });
  }

  // 3. Check if already in wishlist
  const alreadyInWishlist = wishlist.products.some(
    (id) => id.toString() === productId
  );

  if (alreadyInWishlist) {
    throw new ApiError(409, "Product is already in your wishlist");
  }

  // 4. Add product to wishlist
  wishlist.products.push(productId);
  await wishlist.save();

  // 5. Populate and return
  await wishlist.populate({
    path:   "products",
    select: "name slug price comparePrice images stock ratings isActive",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        wishlist: {
          _id:        wishlist._id,
          products:   wishlist.products,
          totalItems: wishlist.totalItems,
        },
      },
      "Product added to wishlist successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Remove product from wishlist
// @route   DELETE /api/v1/wishlist/:productId
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found");
  }

  // Check if product is in wishlist
  const productExists = wishlist.products.some(
    (id) => id.toString() === productId
  );

  if (!productExists) {
    throw new ApiError(404, "Product not found in wishlist");
  }

  // Remove product from wishlist
  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId
  );

  await wishlist.save();

  // Populate remaining products
  await wishlist.populate({
    path:   "products",
    select: "name slug price comparePrice images stock ratings isActive",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        wishlist: {
          _id:        wishlist._id,
          products:   wishlist.products,
          totalItems: wishlist.totalItems,
        },
      },
      "Product removed from wishlist successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Clear entire wishlist
// @route   DELETE /api/v1/wishlist
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    return res.status(200).json(
      new ApiResponse(200, {}, "Wishlist is already empty")
    );
  }

  wishlist.products = [];
  await wishlist.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Wishlist cleared successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Move product from wishlist to cart
// @route   POST /api/v1/wishlist/move-to-cart
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const moveToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // 1. Find wishlist
  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found");
  }

  // 2. Check product is in wishlist
  const productInWishlist = wishlist.products.some(
    (id) => id.toString() === productId
  );

  if (!productInWishlist) {
    throw new ApiError(404, "Product not found in wishlist");
  }

  // 3. Verify product exists and has stock
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.isActive) {
    throw new ApiError(400, "Product is no longer available");
  }

  if (product.stock < quantity) {
    throw new ApiError(
      400,
      `Only ${product.stock} item(s) available in stock`
    );
  }

  // 4. Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = new Cart({
      user:  req.user._id,
      items: [],
    });
  }

  // 5. Add to cart (or increase quantity if already exists)
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    const newQuantity =
      cart.items[existingItemIndex].quantity + parseInt(quantity);

    if (newQuantity > product.stock) {
      throw new ApiError(
        400,
        `Cannot add more. Only ${product.stock} item(s) in stock.`
      );
    }
    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].price    = product.price;
  } else {
    cart.items.push({
      product:  productId,
      quantity: parseInt(quantity),
      price:    product.price,
    });
  }

  await cart.save();

  // 6. Remove from wishlist after moving to cart
  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId
  );
  await wishlist.save();

  // 7. Populate cart
  await cart.populate({
    path:   "items.product",
    select: "name slug price images stock",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        cart: {
          _id:        cart._id,
          items:      cart.items,
          totalItems: cart.totalItems,
          totalPrice: parseFloat(cart.totalPrice.toFixed(2)),
        },
        message: `${product.name} moved to cart successfully`,
      },
      "Product moved to cart successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Check if product is in wishlist
// @route   GET /api/v1/wishlist/check/:productId
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const checkWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });

  const isInWishlist = wishlist
    ? wishlist.products.some((id) => id.toString() === productId)
    : false;

  return res.status(200).json(
    new ApiResponse(
      200,
      { isInWishlist },
      "Wishlist check completed"
    )
  );
});