import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ApiError from "../utils/ApiError.js";

// ─── Get Current Directory (ES Module fix) ───────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Create uploads/tmp folder if it doesn't exist ───────────
const tmpDir = path.join(__dirname, "../../uploads/tmp");

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log("✅ Temp upload directory created:", tmpDir);
}

/*
WHY CHANGE FROM /tmp TO LOCAL FOLDER?
  /tmp works on Linux/Mac (Render deployment)
  Windows does NOT have /tmp directory
  
  Solution: Create uploads/tmp inside our project
  Works on BOTH Windows (dev) and Linux (production)
  
  We add uploads/ to .gitignore so it's never committed.
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext          = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ─── File Filter ──────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(400, "Only JPEG, PNG, WEBP, and GIF images are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

export default upload;