import { body, param } from "express-validator";

export const createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Product name must be between 3 and 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("shortDescription")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("comparePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("sku")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("SKU cannot exceed 100 characters"),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const updateProductValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Product name must be between 3 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("comparePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number"),

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const mongoIdValidator = (field = "id") => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
];