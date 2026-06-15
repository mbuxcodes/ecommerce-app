import { body, param } from "express-validator";

export const createOrderValidator = [
  body("shippingAddress")
    .notEmpty()
    .withMessage("Shipping address is required")
    .isObject()
    .withMessage("Shipping address must be an object"),

  body("shippingAddress.fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),

  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required"),

  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required"),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),

  body("shippingAddress.postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required"),

  body("shippingAddress.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["stripe", "cod"])
    .withMessage("Payment method must be stripe or cod"),
];

export const updateOrderStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),

  param("id")
    .isMongoId()
    .withMessage("Invalid order ID"),
];

export const orderIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid order ID"),
];