import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/User.model.js";

/*
HOW IT WORKS:
  1. Client sends: Authorization: "Bearer eyJhbGciOi..."
  2. We extract the token from the header
  3. We verify it using our secret key
  4. We attach the full user object to req.user
  5. Next middleware/controller can access req.user
*/

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Access token required");
  }

  const token = authHeader.split(" ")[1]; // Get the token part after "Bearer "

  // Verify the token
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  // If token is invalid or expired, jwt.verify throws an error
  // That error is caught by asyncHandler and passed to errorHandler

  // Find user in database
  const user = await User.findById(decoded.userId).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "Invalid access token - user not found");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  // Attach user to request object
  req.user = user;

  next(); // Proceed to next middleware or controller
});