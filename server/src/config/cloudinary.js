import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log("✅ Cloudinary Connected");
};

export default connectCloudinary;

/*
CLOUDINARY FOLDERS STRUCTURE:
  ecommerce/
  ├── avatars/       → User profile pictures
  ├── categories/    → Category images
  ├── products/      → Product images
  └── general/       → Other uploads

WHY FOLDERS?
  Organizes images in Cloudinary dashboard.
  Easy to manage, find, and bulk delete.
  Each folder can have different transformations.
*/