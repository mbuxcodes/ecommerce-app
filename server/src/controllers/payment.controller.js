import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Order from "../models/Order.model.js";
import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import stripeClient from "../config/stripe.js";

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
  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get Stripe publishable key
// @route   GET /api/v1/payment/config
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getStripeConfig = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      },
      "Stripe config fetched"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Create Stripe Payment Intent
// @route   POST /api/v1/payment/create-intent
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { shippingAddress } = req.body;

  if (!shippingAddress) {
    throw new ApiError(400, "Shipping address is required");
  }

  // 1. Get user cart
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path:   "items.product",
    select: "name price images stock isActive",
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  // 2. Validate cart items
  for (const item of cart.items) {
    if (!item.product || !item.product.isActive) {
      throw new ApiError(400, `Product "${item.product?.name}" is not available`);
    }
    if (item.product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Only ${item.product.stock} item(s) of "${item.product.name}" available`
      );
    }
  }

  // 3. Calculate total price
  const orderItems = cart.items.map((item) => ({
    product:  item.product._id,
    name:     item.product.name,
    image:    item.product.images?.[0]?.url || "",
    price:    item.product.price,
    quantity: item.quantity,
  }));

  const { itemsPrice, shippingPrice, taxPrice, totalPrice } =
    calculatePrices(orderItems);

  /*
  STRIPE AMOUNT:
    Stripe requires amount in SMALLEST currency unit.
    For USD: dollars × 100 = cents
    $47.68 → 4768 cents

    NEVER send decimal amounts to Stripe.
    Always multiply by 100 and round.
  */
  const amountInCents = Math.round(totalPrice * 100);

  // 4. Create Stripe PaymentIntent
  const paymentIntent = await stripeClient.paymentIntents.create({
    amount:   amountInCents,
    currency: "usd",
    /*
    automatic_payment_methods: true
      Stripe automatically shows the best payment methods
      for the customer's location (card, Apple Pay, etc.)
    */
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      userId:          req.user._id.toString(),
      userEmail:       req.user.email,
      itemsPrice:      itemsPrice.toString(),
      shippingPrice:   shippingPrice.toString(),
      taxPrice:        taxPrice.toString(),
      totalPrice:      totalPrice.toString(),
      shippingAddress: JSON.stringify(shippingAddress),
      cartItems:       JSON.stringify(
        orderItems.map((item) => ({
          product:  item.product.toString(),
          name:     item.name,
          price:    item.price,
          quantity: item.quantity,
          image:    item.image,
        }))
      ),
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        clientSecret:    paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount:          totalPrice,
        breakdown: {
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice,
        },
      },
      "Payment intent created successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Confirm payment and create order
// @route   POST /api/v1/payment/confirm
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    throw new ApiError(400, "Payment intent ID is required");
  }

  // 1. Retrieve payment intent from Stripe
  let paymentIntent;
  try {
    paymentIntent = await stripeClient.paymentIntents.retrieve(
      paymentIntentId
    );
  } catch (error) {
    throw new ApiError(400, "Invalid payment intent ID");
  }

  // 2. Check payment was successful
  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(
      400,
      `Payment not completed. Status: ${paymentIntent.status}`
    );
  }

  // 3. Check order not already created for this payment
  const existingOrder = await Order.findOne({
    "paymentResult.stripePaymentIntentId": paymentIntentId,
  });

  if (existingOrder) {
    return res.status(200).json(
      new ApiResponse(
        200,
        { order: existingOrder },
        "Order already created for this payment"
      )
    );
  }

  // 4. Extract data from payment intent metadata
  const metadata       = paymentIntent.metadata;
  const shippingAddress = JSON.parse(metadata.shippingAddress);
  const cartItems      = JSON.parse(metadata.cartItems);

  // 5. Verify stock still available
  for (const item of cartItems) {
    const product = await Product.findById(item.product);
    if (!product || product.stock < item.quantity) {
      throw new ApiError(
        400,
        `"${item.name}" is out of stock. Please contact support.`
      );
    }
  }

  // 6. Create order
  const order = await Order.create({
    user:            metadata.userId,
    items:           cartItems,
    shippingAddress,
    paymentMethod:   "stripe",
    paymentResult: {
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId:        paymentIntent.latest_charge || "",
      status:                paymentIntent.status,
      emailAddress:          paymentIntent.receipt_email || "",
    },
    itemsPrice:    parseFloat(metadata.itemsPrice),
    shippingPrice: parseFloat(metadata.shippingPrice),
    taxPrice:      parseFloat(metadata.taxPrice),
    totalPrice:    parseFloat(metadata.totalPrice),
    isPaid:        true,
    paidAt:        new Date(),
    paymentStatus: "completed",
    status:        "processing",
  });

  // 7. Update stock
  const stockUpdatePromises = cartItems.map((item) =>
    Product.findByIdAndUpdate(item.product, {
      $inc: {
        stock: -item.quantity,
        sold:  item.quantity,
      },
    })
  );
  await Promise.all(stockUpdatePromises);

  // 8. Clear cart
  await Cart.findOneAndUpdate(
    { user: metadata.userId },
    { $set: { items: [] } }
  );

  await order.populate("user", "name email");

  return res.status(201).json(
    new ApiResponse(
      201,
      { order },
      "Payment confirmed and order created successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Stripe Webhook Handler
// @route   POST /api/v1/payment/webhook
// @access  Stripe Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const stripeWebhook = asyncHandler(async (req, res) => {
  /*
  WHAT IS A WEBHOOK?
    Stripe sends POST requests to our server
    whenever a payment event occurs.

    WHY USE WEBHOOKS?
    - Payment can be confirmed asynchronously
    - Handles edge cases (browser closed, network issues)
    - More reliable than client-side confirmation

    WEBHOOK SIGNATURE VERIFICATION:
    - Stripe signs each webhook with our webhook secret
    - We verify the signature to ensure it's really from Stripe
    - If signature is invalid → reject the request
  */

  const signature  = req.headers["stripe-signature"];
  const rawBody    = req.body; // Raw body from express.raw()

  if (!signature) {
    throw new ApiError(400, "Missing Stripe signature");
  }

  // Verify webhook signature
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error.message);
    throw new ApiError(400, `Webhook signature verification failed: ${error.message}`);
  }

  console.log(`✅ Webhook received: ${event.type}`);

  // Handle different event types
  switch (event.type) {

    case "payment_intent.succeeded": {
      /*
      Payment was successful.
      This is a backup to confirmPayment endpoint.
      Creates order if not already created.
      */
      const paymentIntent = event.data.object;
      console.log(`💰 Payment succeeded: ${paymentIntent.id}`);

      // Check if order already exists
      const existingOrder = await Order.findOne({
        "paymentResult.stripePaymentIntentId": paymentIntent.id,
      });

      if (!existingOrder) {
        console.log("📦 Creating order from webhook...");

        try {
          const metadata       = paymentIntent.metadata;
          const shippingAddress = JSON.parse(metadata.shippingAddress || "{}");
          const cartItems      = JSON.parse(metadata.cartItems || "[]");

          if (cartItems.length > 0 && metadata.userId) {
            await Order.create({
              user:            metadata.userId,
              items:           cartItems,
              shippingAddress,
              paymentMethod:   "stripe",
              paymentResult: {
                stripePaymentIntentId: paymentIntent.id,
                status:                paymentIntent.status,
              },
              itemsPrice:    parseFloat(metadata.itemsPrice   || 0),
              shippingPrice: parseFloat(metadata.shippingPrice || 0),
              taxPrice:      parseFloat(metadata.taxPrice      || 0),
              totalPrice:    parseFloat(metadata.totalPrice    || 0),
              isPaid:        true,
              paidAt:        new Date(),
              paymentStatus: "completed",
              status:        "processing",
            });

            // Update stock
            for (const item of cartItems) {
              await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity, sold: item.quantity },
              });
            }

            // Clear cart
            await Cart.findOneAndUpdate(
              { user: metadata.userId },
              { $set: { items: [] } }
            );
          }
        } catch (err) {
          console.error("❌ Error creating order from webhook:", err.message);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      console.log(`❌ Payment failed: ${paymentIntent.id}`);
      /*
      Could send failure email to user here.
      For now just log it.
      */
      break;
    }

    case "charge.refunded": {
      /*
      Handle refunds — update order payment status
      */
      const charge = event.data.object;
      console.log(`💸 Refund processed: ${charge.id}`);

      await Order.findOneAndUpdate(
        { "paymentResult.stripeChargeId": charge.id },
        {
          $set: {
            paymentStatus: "refunded",
          },
        }
      );
      break;
    }

    default:
      console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
  }

  /*
  ALWAYS return 200 to Stripe.
  If we return an error, Stripe will retry
  the webhook multiple times unnecessarily.
  */
  return res.status(200).json({ received: true });
});