import { body, param } from "express-validator";

export const addToWishlistValidator = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
];

export const removeFromWishlistValidator = [
  param("productId")
    .isMongoId()
    .withMessage("Invalid product ID"),
];

export const moveToCartValidator = [
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