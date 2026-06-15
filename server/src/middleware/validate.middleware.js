import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/*
HOW IT WORKS:
  1. We define validation rules in validators/ folder
  2. We chain them in routes: [...rules, validate, controller]
  3. express-validator runs all rules
  4. validate middleware checks if any failed
  5. If yes → throw ApiError with all error messages
  6. If no → call next() to reach controller

EXAMPLE ROUTE:
  router.post("/register", registerValidator, validate, register)
*/

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    throw new ApiError(400, "Validation failed", errorMessages);
  }

  next();
};

export default validate;