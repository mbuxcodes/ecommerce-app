import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  getTransformedUrl,
} from "../utils/uploadToCloudinary.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Upload single image
// @route   POST /api/v1/upload/single
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please upload an image file");
  }

  // Get folder from query param or default
  const folder = req.query.folder
    ? `ecommerce/${req.query.folder}`
    : "ecommerce/general";

  const uploaded = await uploadToCloudinary(req.file.path, folder);

  if (!uploaded) {
    throw new ApiError(500, "Failed to upload image");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        url:      uploaded.url,
        publicId: uploaded.publicId,
        width:    uploaded.width,
        height:   uploaded.height,
        format:   uploaded.format,
        size:     uploaded.size,
      },
      "Image uploaded successfully"
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Upload multiple images
// @route   POST /api/v1/upload/multiple
// @access  Private
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "Please upload at least one image");
  }

  const folder = req.query.folder
    ? `ecommerce/${req.query.folder}`
    : "ecommerce/general";

  // Get all file paths
  const filePaths = req.files.map((file) => file.path);

  // Upload all to Cloudinary
  const { uploaded, failed } = await uploadMultipleToCloudinary(
    filePaths,
    folder
  );

  if (uploaded.length === 0) {
    throw new ApiError(500, "Failed to upload all images");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        uploaded,
        failed,
        totalUploaded: uploaded.length,
        totalFailed:   failed.length,
      },
      `${uploaded.length} image(s) uploaded successfully`
    )
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Delete image from Cloudinary
// @route   DELETE /api/v1/upload
// @access  Private (Admin)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    throw new ApiError(400, "Public ID is required");
  }

  const result = await deleteFromCloudinary(publicId);

  if (result?.result !== "ok") {
    throw new ApiError(400, "Failed to delete image or image not found");
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Image deleted successfully")
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @desc    Get transformed image URL
// @route   GET /api/v1/upload/transform
// @access  Public
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getTransformedImage = asyncHandler(async (req, res) => {
  const {
    publicId,
    width,
    height,
    crop,
    quality,
    format,
  } = req.query;

  if (!publicId) {
    throw new ApiError(400, "Public ID is required");
  }

  const url = getTransformedUrl(publicId, {
    width:   width   ? parseInt(width)   : undefined,
    height:  height  ? parseInt(height)  : undefined,
    crop,
    quality,
    format,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { url },
      "Transformed URL generated successfully"
    )
  );
});