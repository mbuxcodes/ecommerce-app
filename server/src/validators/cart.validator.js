import { body, param } from "express-validator";

export const addToCartValidator = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("quantity")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Quantity must be between 1 and 100"),
];

export const updateCartValidator = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1, max: 100 })
    .withMessage("Quantity must be between 1 and 100"),
];

export const cartItemIdValidator = [
  param("itemId")
    .isMongoId()
    .withMessage("Invalid cart item ID"),
];