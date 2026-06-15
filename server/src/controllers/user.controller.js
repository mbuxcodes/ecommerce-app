import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/User.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";
import { PAGINATION } from "../constants/index.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get all users (with pagination + search)
// @route   GET /api/v1/users
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page     = PAGINATION.DEFAULT_PAGE,
    limit    = PAGINATION.DEFAULT_LIMIT,
    search   = "",
    role     = "",
    isActive = "",
    sortBy   = "createdAt",
    order    = "desc",
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  // ─── Build Query Filter ───────────────────────────────────────
  const filter = {};

  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role)     filter.role     = role;
  if (isActive) filter.isActive = isActive === "true";

  // ─── Build Sort ───────────────────────────────────────────────
  const sortOrder = order === "asc" ? 1 : -1;
  const sort      = { [sortBy]: sortOrder };

  // ─── Execute Query ────────────────────────────────────────────
  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-refreshToken -resetPasswordToken -resetPasswordExpiry"),
    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalUsers / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          currentPage:  pageNum,
          totalPages,
          totalUsers,
          limit:        limitNum,
          hasNextPage:  pageNum < totalPages,
          hasPrevPage:  pageNum > 1,
        },
      },
      "Users fetched successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get single user by ID
// @route   GET /api/v1/users/:id
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "-refreshToken -resetPasswordToken -resetPasswordExpiry"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { user }, "User fetched successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update own profile
// @route   PUT /api/v1/users/profile
// @access  Private (logged in user)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, addresses } = req.body;

  /*
  SECURITY: We only allow updating specific fields.
  User cannot change their own email, role, or password here.
  Password change has its own dedicated endpoint.
  Role change is admin-only.
  */
  const updateFields = {};
  if (name      !== undefined) updateFields.name      = name;
  if (phone     !== undefined) updateFields.phone     = phone;
  if (addresses !== undefined) updateFields.addresses = addresses;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    {
      new:            true,  // Return updated document
      runValidators:  true,  // Run schema validators on update
    }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: user.getPublicProfile() },
      "Profile updated successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Change own password
// @route   PUT /api/v1/users/password
// @access  Private (logged in user)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Get user with password field
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 2. Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // 3. Check new password is different
  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw new ApiError(
      400,
      "New password must be different from current password"
    );
  }

  // 4. Update password — pre-save hook hashes it automatically
  user.password = newPassword;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully. Please login again.")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Upload / Update user avatar
// @route   POST /api/v1/users/avatar
// @access  Private (logged in user)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const uploadAvatar = asyncHandler(async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    throw new ApiError(400, "Please upload an image file");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 1. Delete old avatar from Cloudinary if exists
  if (user.avatar?.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  // 2. Upload new avatar to Cloudinary
  const uploaded = await uploadToCloudinary(
    req.file.path,
    "ecommerce/avatars"
  );

  if (!uploaded) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  // 3. Update user avatar in DB
  user.avatar = {
    url:      uploaded.url,
    publicId: uploaded.publicId,
  };
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      { avatar: user.avatar },
      "Avatar uploaded successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Update user role
// @route   PUT /api/v1/users/:id/role
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  // Prevent admin from changing their own role
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot change your own role");
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { role } },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: user.getPublicProfile() },
      `User role updated to ${role} successfully`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const deleteUser = asyncHandler(async (req, res) => {
  // Prevent admin from deleting themselves
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete avatar from Cloudinary if exists
  if (user.avatar?.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  await User.findByIdAndDelete(req.params.id);

  return res.status(200).json(
    new ApiResponse(200, {}, "User deleted successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Toggle user active status
// @route   PUT /api/v1/users/:id/status
// @access  Admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const toggleUserStatus = asyncHandler(async (req, res) => {
  // Prevent admin from deactivating themselves
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot change your own status");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Toggle the isActive field
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: user.getPublicProfile() },
      `User ${user.isActive ? "activated" : "deactivated"} successfully`
    )
  );
});