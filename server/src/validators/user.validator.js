import { body, param } from "express-validator";

export const updateProfileValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .withMessage("Please provide a valid phone number"),

  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),

  body("addresses.*.fullName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address full name is required"),

  body("addresses.*.phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address phone is required"),

  body("addresses.*.street")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Street is required"),

  body("addresses.*.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("City is required"),

  body("addresses.*.state")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("State is required"),

  body("addresses.*.postalCode")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Postal code is required"),

  body("addresses.*.country")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Country is required"),
];

export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase, one lowercase, and one number"
    ),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your new password")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

export const updateRoleValidator = [
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["customer", "admin"])
    .withMessage("Role must be either customer or admin"),
];

export const mongoIdValidator = (field = "id") => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
];