import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/User.model.js";
import { generateTokenPair } from "../utils/generateTokens.js";
import { COOKIE_OPTIONS } from "../constants/index.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

// ─── Helper: Set Refresh Token Cookie ────────────────────────────────────────
/*
We always set the refresh token in an httpOnly cookie.
httpOnly = JavaScript on the browser CANNOT read this cookie.
This protects against XSS attacks stealing the refresh token.
*/
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
};

// ─── Helper: Clear Refresh Token Cookie ──────────────────────────────────────
const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  // 2. Create new user
  // Password is hashed automatically by the pre-save hook in User.model.js
  const user = await User.create({ name, email, password });

  // 3. Generate access + refresh tokens
  const { accessToken, refreshToken } = generateTokenPair(
    user._id,
    user.role
  );

  // 4. Save refresh token to DB (for logout/invalidation)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  /*
  validateBeforeSave: false → Skip validation on this save.
  We only changed refreshToken, no need to re-validate
  name/email/password again.
  */

  // 5. Set refresh token in httpOnly cookie
  setRefreshTokenCookie(res, refreshToken);

  // 6. Send response with access token
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user:        user.getPublicProfile(),
        accessToken,
      },
      "Account created successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Find user by email — include password field (select:false by default)
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    /*
    SECURITY NOTE:
      We say "Invalid credentials" instead of "User not found"
      to prevent email enumeration attacks.
      (Attacker can't tell if email exists or password is wrong)
    */
    throw new ApiError(401, "Invalid email or password");
  }

  // 2. Check if account is active
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account has been deactivated. Please contact support."
    );
  }

  // 3. Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // 4. Generate new token pair
  const { accessToken, refreshToken } = generateTokenPair(
    user._id,
    user.role
  );

  // 5. Save new refresh token to DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // 6. Set cookie + send response
  setRefreshTokenCookie(res, refreshToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user:        user.getPublicProfile(),
        accessToken,
      },
      "Logged in successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const logout = asyncHandler(async (req, res) => {
  // 1. Remove refresh token from DB
  // This invalidates the token even if it hasn't expired
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  // 2. Clear the cookie from browser
  clearRefreshTokenCookie(res);

  return res.status(200).json(
    new ApiResponse(200, {}, "Logged out successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Refresh access token using refresh token cookie
// @route   POST /api/v1/auth/refresh-token
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. Get refresh token from httpOnly cookie
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not found. Please login again.");
  }

  // 2. Verify refresh token signature
  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token. Please login again.");
  }

  // 3. Find user and check if refresh token matches DB
  const user = await User.findById(decoded.userId).select("+refreshToken");

  if (!user) {
    throw new ApiError(401, "User not found. Please login again.");
  }

  if (user.refreshToken !== incomingRefreshToken) {
    /*
    TOKEN ROTATION SECURITY:
      If tokens don't match, it means either:
      1. User already logged out (token cleared from DB)
      2. Token was stolen and already used by attacker
      In both cases, force re-login.
    */
    throw new ApiError(401, "Refresh token is expired or already used. Please login again.");
  }

  // 4. Generate new token pair (Token Rotation)
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
    user._id,
    user.role
  );

  // 5. Update refresh token in DB
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  // 6. Set new cookie + send new access token
  setRefreshTokenCookie(res, newRefreshToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      { accessToken },
      "Access token refreshed successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get current logged-in user
// @route   GET /api/v1/auth/me
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getMe = asyncHandler(async (req, res) => {
  // req.user is already set by verifyJWT middleware
  // We fetch fresh data from DB to ensure it's up-to-date
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { user: user.getPublicProfile() }, "User fetched successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Send forgot password email
// @route   POST /api/v1/auth/forgot-password
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. Find user by email
  const user = await User.findOne({ email });

  /*
  SECURITY: We always return success even if email doesn't exist.
  This prevents attackers from knowing which emails are registered.
  */
  if (!user) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "If an account with that email exists, a password reset link has been sent."
      )
    );
  }

  // 2. Generate a raw random token using Node's crypto module
  const resetToken = crypto.randomBytes(32).toString("hex");
  /*
  crypto.randomBytes(32) generates 32 random bytes
  .toString("hex") converts to 64-character hex string
  This is UNPREDICTABLE and CRYPTOGRAPHICALLY SECURE
  */

  // 3. Hash the token before storing in DB
  // We store the HASH, not the raw token
  // If DB is compromised, attacker can't use the hash directly
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 4. Save hashed token + expiry to user document
  user.resetPasswordToken  = hashedToken;
  user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  // 5. Build reset URL with RAW token (not hashed)
  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // 6. Send email
  try {
    await sendEmail({
      to:      user.email,
      subject: "Password Reset Request - E-Commerce Store",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetURL}"
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5;
                    color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Reset Password
          </a>
          <p>This link will expire in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            For security, never share this link with anyone.
          </p>
        </div>
      `,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "If an account with that email exists, a password reset link has been sent."
      )
    );
  } catch (error) {
    // If email fails, clear the reset token from DB
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(500, "Failed to send reset email. Please try again.");
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Reset password using token from email
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const resetPassword = asyncHandler(async (req, res) => {
  const { token }    = req.params;
  const { password } = req.body;

  // 1. Hash the incoming raw token to compare with DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // 2. Find user with matching token that hasn't expired
  const user = await User.findOne({
    resetPasswordToken:  hashedToken,
    resetPasswordExpiry: { $gt: Date.now() }, // Token must not be expired
  }).select("+resetPasswordToken +resetPasswordExpiry");

  if (!user) {
    throw new ApiError(400, "Password reset token is invalid or has expired");
  }

  // 3. Set new password (pre-save hook will hash it)
  user.password            = password;
  user.resetPasswordToken  = undefined; // Clear token
  user.resetPasswordExpiry = undefined; // Clear expiry
  user.refreshToken        = undefined; // Force re-login on all devices
  await user.save();

  // 4. Send confirmation email
  try {
    await sendEmail({
      to:      user.email,
      subject: "Password Changed Successfully",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed</h2>
          <p>Hello ${user.name},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
        </div>
      `,
    });
  } catch (error) {
    // Don't throw — password was already changed successfully
    console.error("Failed to send password change confirmation email:", error);
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset successfully. Please login with your new password.")
  );
});