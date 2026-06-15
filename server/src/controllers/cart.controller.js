import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path:   "items.product",
    select: "name slug price comparePrice images stock isActive",
    /*
    We populate the product reference so frontend gets:
    - Current price (to detect price changes)
    - Stock level (to show "Only X left")
    - Images (to show product thumbnail)
    - isActive (to show if product is still available)
    */
  });

  // If no cart exists yet, return empty cart
  if (!cart) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          cart: {
            items:      [],
            totalItems: 0,
            totalPrice: 0,
          },
        },
        "Cart is empty"
      )
    );
  }

  /*
  PRICE VALIDATION:
    Check if any product prices have changed since
    they were added to cart. This is important for
    accurate checkout totals.
  */
  let cartUpdated = false;

  for (const item of cart.items) {
    if (!item.product) {
      // Product was deleted — remove from cart
      cart.items = cart.items.filter(
        (i) => i._id.toString() !== item._id.toString()
      );
      cartUpdated = true;
      continue;
    }

    if (!item.product.isActive) {
      // Product deactivated — remove from cart
      cart.items = cart.items.filter(
        (i) => i._id.toString() !== item._id.toString()
      );
      cartUpdated = true;
      continue;
    }

    // Update price if it changed
    if (item.price !== item.product.price) {
      item.price  = item.product.price;
      cartUpdated = true;
    }
  }

  if (cartUpdated) {
    await cart.save();
  }

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
      },
      "Cart fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Add item to cart
// @route   POST /api/v1/cart
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // 1. Verify product exists and is active
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.isActive) {
    throw new ApiError(400, "Product is no longer available");
  }

  // 2. Check stock availability
  if (product.stock < quantity) {
    throw new ApiError(
      400,
      `Only ${product.stock} item(s) available in stock`
    );
  }

  // 3. Find or create cart for this user
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // First time adding to cart — create new cart
    cart = new Cart({
      user:  req.user._id,
      items: [],
    });
  }

  // 4. Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    /*
    PRODUCT ALREADY IN CART:
      Instead of adding a new item, increase quantity.
      But check if new total quantity exceeds stock.
    */
    const newQuantity =
      cart.items[existingItemIndex].quantity + quantity;

    if (newQuantity > product.stock) {
      throw new ApiError(
        400,
        `Cannot add more. Only ${product.stock} item(s) available. You already have ${cart.items[existingItemIndex].quantity} in cart.`
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].price    = product.price;
    // Update price in case it changed
  } else {
    // 5. Add new item to cart
    cart.items.push({
      product:  productId,
      quantity: parseInt(quantity),
      price:    product.price,
    });
  }

  await cart.save();

  // 6. Populate product details before sending response
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
      },
      "Item added to cart successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:itemId
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId }   = req.params;
  const { quantity } = req.body;

  // 1. Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // 2. Find the specific item in cart
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  // 3. Verify stock availability
  const product = await Product.findById(
    cart.items[itemIndex].product
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (quantity > product.stock) {
    throw new ApiError(
      400,
      `Only ${product.stock} item(s) available in stock`
    );
  }

  // 4. Update quantity
  cart.items[itemIndex].quantity = parseInt(quantity);
  cart.items[itemIndex].price    = product.price;

  await cart.save();

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
      },
      "Cart updated successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:itemId
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // Check if item exists in cart
  const itemExists = cart.items.some(
    (item) => item._id.toString() === itemId
  );

  if (!itemExists) {
    throw new ApiError(404, "Item not found in cart");
  }

  // Remove item using $pull operator
  /*
  $pull removes all array elements matching condition.
  Much cleaner than:
    cart.items = cart.items.filter(item => item._id !== itemId)
  */
  cart.items = cart.items.filter(
    (item) => item._id.toString() !== itemId
  );

  await cart.save();

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
      },
      "Item removed from cart successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Clear entire cart
// @route   DELETE /api/v1/cart
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(200).json(
      new ApiResponse(200, {}, "Cart is already empty")
    );
  }

  // Clear all items
  cart.items = [];
  await cart.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Cart cleared successfully")
  );
});