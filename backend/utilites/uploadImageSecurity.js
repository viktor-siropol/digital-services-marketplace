import path from "path";
import { fileTypeFromFile } from "file-type";

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const MIME_TYPE_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const normalizeExtension = (extension = "") => extension.toLowerCase();

const createUploadValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const validateUploadedImageFiles = async (files = []) => {
  if (!Array.isArray(files)) {
    throw createUploadValidationError("Invalid uploaded files payload");
  }

  for (const file of files) {
    if (!file?.path) {
      throw createUploadValidationError(
        "Uploaded image is missing its temporary file path",
      );
    }

    if (Number(file?.size || 0) <= 0) {
      throw createUploadValidationError("Uploaded image is empty");
    }

    const originalExtension = normalizeExtension(
      path.extname(file.originalname || ""),
    );

    const storedExtension = normalizeExtension(
      path.extname(file.filename || file.path || ""),
    );

    if (!ALLOWED_IMAGE_EXTENSIONS.has(originalExtension)) {
      throw createUploadValidationError(
        `Unsupported file extension: ${originalExtension || "unknown"}`,
      );
    }

    if (!ALLOWED_IMAGE_EXTENSIONS.has(storedExtension)) {
      throw createUploadValidationError(
        "Stored upload has an invalid image extension",
      );
    }

    const expectedMimeType = MIME_TYPE_BY_EXTENSION.get(originalExtension);

    if (!expectedMimeType) {
      throw createUploadValidationError("Unsupported uploaded image type");
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw createUploadValidationError(
        "Only JPG, PNG and WEBP images are allowed",
      );
    }

    if (file.mimetype !== expectedMimeType) {
      throw createUploadValidationError(
        "Uploaded file extension does not match its declared image type",
      );
    }

    const detectedFileType = await fileTypeFromFile(file.path);

    if (!detectedFileType) {
      throw createUploadValidationError(
        "Could not verify the uploaded file signature",
      );
    }

    const detectedExtension = `.${detectedFileType.ext.toLowerCase()}`;
    const detectedMimeType = detectedFileType.mime;

    if (!ALLOWED_IMAGE_MIME_TYPES.has(detectedMimeType)) {
      throw createUploadValidationError(
        "Uploaded file is not a supported image type",
      );
    }

    const normalizedDetectedExtension =
      detectedExtension === ".jpg" ? ".jpeg" : detectedExtension;

    const originalMatchesDetected =
      originalExtension === detectedExtension ||
      originalExtension === normalizedDetectedExtension;

    const storedMatchesDetected =
      storedExtension === detectedExtension ||
      storedExtension === normalizedDetectedExtension;

    if (!originalMatchesDetected || !storedMatchesDetected) {
      throw createUploadValidationError(
        "Uploaded file extension does not match its real file signature",
      );
    }

    if (
      detectedMimeType !== expectedMimeType ||
      detectedMimeType !== file.mimetype
    ) {
      throw createUploadValidationError(
        "Uploaded file content does not match the allowed image type",
      );
    }
  }
};
