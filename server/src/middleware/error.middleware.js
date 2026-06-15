import ApiError from "../utils/ApiError.js";
import multer from "multer";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // ─── Handle Multer Errors ─────────────────────────────────
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      error = new ApiError(400, "File too large. Maximum size is 5MB");
    } else if (err.code === "LIMIT_FILE_COUNT") {
      error = new ApiError(400, "Too many files. Maximum 10 files allowed");
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      error = new ApiError(
        400,
        `Unexpected field name. Use 'images' as the field name in form-data`
      );
    } else {
      error = new ApiError(400, err.message);
    }
  }

  // ─── Handle Other Errors ──────────────────────────────────
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message    = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ID format: ${err.value}`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `${field} already exists`);
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, messages.join(", "));
  }

  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired");
  }

  const response = {
    success:    false,
    statusCode: error.statusCode,
    message:    error.message,
    errors:     error.errors,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};

export default errorHandler;