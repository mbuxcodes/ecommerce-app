class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);           // Call parent Error constructor
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;     // Validation errors array
    this.message = message;

    // Capture stack trace for debugging
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;

/*
WHY WE USE THIS:
─────────────────
Instead of: res.status(404).json({ message: "User not found" })
We throw:   throw new ApiError(404, "User not found")

The global error middleware catches it and sends the response.
This means controllers stay clean and errors are handled in one place.

USAGE EXAMPLES:
  throw new ApiError(400, "Invalid email")
  throw new ApiError(401, "Unauthorized")
  throw new ApiError(403, "Forbidden")
  throw new ApiError(404, "Product not found")
  throw new ApiError(409, "Email already exists")
  throw new ApiError(500, "Internal server error")
*/