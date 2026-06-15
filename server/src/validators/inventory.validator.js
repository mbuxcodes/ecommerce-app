import { body, param, query } from "express-validator";

export const updateStockValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("stock")
    .notEmpty()
    .withMessage("Stock quantity is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("operation")
    .optional()
    .isIn(["set", "increment", "decrement"])
    .withMessage("Operation must be set, increment, or decrement"),
];

export const bulkUpdateStockValidator = [
  body("updates")
    .notEmpty()
    .withMessage("Updates array is required")
    .isArray({ min: 1, max: 50 })
    .withMessage("Updates must be an array of 1-50 items"),

  body("updates.*.productId")
    .isMongoId()
    .withMessage("Each item must have a valid product ID"),

  body("updates.*.stock")
    .isInt({ min: 0 })
    .withMessage("Each item must have a valid stock quantity"),

  body("updates.*.operation")
    .optional()
    .isIn(["set", "increment", "decrement"])
    .withMessage("Operation must be set, increment, or decrement"),
];

export const restockValidator = [
  body("products")
    .optional()
    .isArray()
    .withMessage("Products must be an array"),

  body("products.*.productId")
    .optional()
    .isMongoId()
    .withMessage("Each item must have a valid product ID"),

  body("products.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),

  body("defaultQuantity")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Default quantity must be between 1 and 10000"),
];