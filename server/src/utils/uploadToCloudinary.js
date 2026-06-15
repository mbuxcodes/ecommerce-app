import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// ─── Upload Presets by Folder Type ───────────────────────────
/*
Different image types need different transformations:
  - Avatars:     small, square, face-focused
  - Categories:  medium, landscape
  - Products:    large, high quality, multiple formats
*/
const UPLOAD_PRESETS = {
  avatar: {
    transformation: [
      { width: 400,  height: 400, crop: "fill", gravity: "face" },
      { quality: "auto"     },
      { fetch_format: "auto"},
    ],
  },
  category: {
    transformation: [
      { width: 800, height: 600, crop: "fill" },
      { quality: "auto"     },
      { fetch_format: "auto"},
    ],
  },
  product: {
    transformation: [
      { width: 1000, crop: "limit" },
      { quality: "auto"            },
      { fetch_format: "auto"       },
    ],
  },
  general: {
    transformation: [
      { width: 1200, crop: "limit" },
      { quality: "auto"            },
      { fetch_format: "auto"       },
    ],
  },
};

// ─── Get Preset from Folder Name ─────────────────────────────
const getPreset = (folder) => {
  if (folder.includes("avatar"))   return UPLOAD_PRESETS.avatar;
  if (folder.includes("categor"))  return UPLOAD_PRESETS.category;
  if (folder.includes("product"))  return UPLOAD_PRESETS.product;
  return UPLOAD_PRESETS.general;
};

// ─── Upload Single File to Cloudinary ────────────────────────
export const uploadToCloudinary = async (
  localFilePath,
  folder = "ecommerce/general"
) => {
  if (!localFilePath) return null;

  try {
    const preset = getPreset(folder);

    const response = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type:  "auto",
      ...preset,
    });

    // Delete temp file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return {
      url:      response.secure_url,
      publicId: response.public_id,
      width:    response.width,
      height:   response.height,
      format:   response.format,
      size:     response.bytes,
    };
  } catch (error) {
    // Always delete temp file even on failure
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw error;
  }
};

// ─── Upload Multiple Files to Cloudinary ─────────────────────
export const uploadMultipleToCloudinary = async (
  localFilePaths,
  folder = "ecommerce/general"
) => {
  if (!localFilePaths || localFilePaths.length === 0) return [];

  const uploadPromises = localFilePaths.map((filePath) =>
    uploadToCloudinary(filePath, folder)
  );

  /*
  Promise.allSettled vs Promise.all:
    Promise.all:         If ONE fails → ALL fail
    Promise.allSettled:  Each resolves independently
                         Failed ones return {status: "rejected"}
                         We can skip failed and keep successful
  */
  const results = await Promise.allSettled(uploadPromises);

  const uploaded = [];
  const failed   = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      uploaded.push(result.value);
    } else {
      failed.push({ index, reason: result.reason?.message });
    }
  });

  return { uploaded, failed };
};

// ─── Delete Single File from Cloudinary ──────────────────────
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;

  try {
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Failed to delete from Cloudinary:", error.message);
    return null;
  }
};

// ─── Delete Multiple Files from Cloudinary ───────────────────
export const deleteMultipleFromCloudinary = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) return null;

  try {
    /*
    cloudinary.api.delete_resources deletes multiple
    images in a single API call — much faster than
    calling destroy() in a loop
    */
    const response = await cloudinary.api.delete_resources(publicIds);
    return response;
  } catch (error) {
    console.error("Failed to delete multiple from Cloudinary:", error.message);
    return null;
  }
};

// ─── Get Cloudinary Image URL with Transformations ───────────
/*
USAGE:
  getTransformedUrl(publicId, { width: 300, height: 300 })
  → Returns resized image URL without re-uploading
  
This is Cloudinary's power — transform on-the-fly via URL
*/
export const getTransformedUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop    = "fill",
    quality = "auto",
    format  = "auto",
  } = options;

  const transformation = [];

  if (width || height) {
    transformation.push({ width, height, crop });
  }

  transformation.push({ quality });
  transformation.push({ fetch_format: format });

  return cloudinary.url(publicId, {
    secure:         true,
    transformation,
  });
};