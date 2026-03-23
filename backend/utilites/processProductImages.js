import fsPromises from "fs/promises";
import sharp from "sharp";
import { randomUUID } from "crypto";
import {
  buildCloudinaryAssetFolder,
  buildCloudinaryImagePublicId,
  buildCloudinaryImageUrls,
  deleteCloudinaryImageByPublicId,
  uploadBufferToCloudinary,
} from "./cloudinaryProductImages.js";
import { logCleanupError } from "./logCleanupError.js";

const safeUnlink = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    logCleanupError({
      scope: "processProductImages.safeUnlink",
      target: filePath,
      error,
    });
  }
};

export const processProductImages = async (files, options = {}) => {
  const {
    sellerId,
    productId,
    deleteInputOnSuccess = true,
    deleteInputOnError = true,
  } = options;

  if (!sellerId) {
    throw new Error("processProductImages requires sellerId");
  }

  if (!productId) {
    throw new Error("processProductImages requires productId");
  }

  const results = [];
  const uploadedPublicIds = [];

  try {
    for (const file of files) {
      const imageId = randomUUID();

      const publicId = buildCloudinaryImagePublicId({
        sellerId,
        productId,
        imageId,
      });

      const assetFolder = buildCloudinaryAssetFolder({
        sellerId,
        productId,
      });

      const normalizedOriginalBuffer = await sharp(file.path)
        .rotate()
        .webp({ quality: 88, effort: 4 })
        .toBuffer();

      await uploadBufferToCloudinary({
        buffer: normalizedOriginalBuffer,
        publicId,
        assetFolder,
      });

      uploadedPublicIds.push(publicId);

      const blurBuffer = await sharp(file.path)
        .rotate()
        .resize(20, 20, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 40, effort: 2 })
        .toBuffer();

      const blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

      const urls = buildCloudinaryImageUrls({ publicId });

      if (deleteInputOnSuccess) {
        await safeUnlink(file.path);
      }

      results.push({
        imageId,
        original: urls.original,
        medium: urls.medium,
        thumbnail: urls.thumbnail,
        blurDataURL,
        alt: "",
      });
    }

    return results;
  } catch (error) {
    for (const publicId of uploadedPublicIds) {
      await deleteCloudinaryImageByPublicId(publicId);
    }

    if (deleteInputOnError) {
      for (const file of files) {
        await safeUnlink(file.path);
      }
    }

    throw error;
  }
};
