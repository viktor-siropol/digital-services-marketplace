import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  validateUploadedImageFiles,
} from "../utilites/uploadImageSecurity.js";
import { deleteManyLocalFiles } from "../utilites/localFileUtils.js";

const TMP_UPLOAD_DIR = "private-uploads/tmp";
const MAX_IMAGE_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_FILE_COUNT = 8;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(TMP_UPLOAD_DIR);

const sanitizeBaseName = (filename = "") => {
  const ext = path.extname(filename).toLowerCase();
  const rawBaseName = path.basename(filename, ext).toLowerCase();

  const sanitizedBaseName = rawBaseName
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return sanitizedBaseName || "image";
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, TMP_UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBaseName = sanitizeBaseName(file.originalname);
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;

    cb(null, `${safeBaseName}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimetype = file.mimetype || "";

  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    cb(new Error("Only JPG, PNG and WEBP image extensions are allowed"));
    return;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimetype)) {
    cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    return;
  }

  cb(null, true);
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE_BYTES,
    files: MAX_IMAGE_FILE_COUNT,
    fields: 20,
    parts: 30,
  },
});

const getUploadErrorMessage = (error) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return "Each image must be 8MB or smaller";
      case "LIMIT_FILE_COUNT":
        return "You can upload up to 8 images at once";
      case "LIMIT_UNEXPECTED_FILE":
        return "Unexpected upload field. Use the images field only";
      case "LIMIT_PART_COUNT":
        return "Too many form parts were submitted";
      case "LIMIT_FIELD_COUNT":
        return "Too many non-file fields were submitted";
      default:
        return "Upload failed due to invalid multipart form data";
    }
  }

  return error?.message || "Upload failed";
};

export const uploadProductImages = (req, res, next) => {
  multerUpload.array("images", MAX_IMAGE_FILE_COUNT)(
    req,
    res,
    async (error) => {
      if (error) {
        if (Array.isArray(req.files) && req.files.length > 0) {
          await deleteManyLocalFiles(req.files.map((file) => file.path));
        }

        return res.status(400).json({
          message: getUploadErrorMessage(error),
        });
      }

      try {
        await validateUploadedImageFiles(req.files || []);
        return next();
      } catch (validationError) {
        if (Array.isArray(req.files) && req.files.length > 0) {
          await deleteManyLocalFiles(req.files.map((file) => file.path));
        }

        return res.status(validationError.statusCode || 400).json({
          message: validationError.message || "Uploaded files are invalid",
        });
      }
    },
  );
};

export default multerUpload;
