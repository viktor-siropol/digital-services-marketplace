import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const safeUnlink = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
  }
};

const buildVariantDir = ({ sellerId, productId, variant }) => {
  return path.join(
    "uploads",
    "products",
    sellerId.toString(),
    productId.toString(),
    variant,
  );
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

  const originalDir = buildVariantDir({
    sellerId,
    productId,
    variant: "original",
  });

  const mediumDir = buildVariantDir({
    sellerId,
    productId,
    variant: "medium",
  });

  const thumbDir = buildVariantDir({
    sellerId,
    productId,
    variant: "thumb",
  });

  ensureDir(originalDir);
  ensureDir(mediumDir);
  ensureDir(thumbDir);

  const results = [];
  const createdFiles = [];

  try {
    for (const file of files) {
      const imageId = randomUUID();
      const webpFileName = `${imageId}.webp`;

      const originalLocalPath = path.join(originalDir, webpFileName);
      const mediumLocalPath = path.join(mediumDir, webpFileName);
      const thumbLocalPath = path.join(thumbDir, webpFileName);

      await sharp(file.path)
        .rotate()
        .webp({ quality: 88, effort: 4 })
        .toFile(originalLocalPath);

      createdFiles.push(originalLocalPath);

      await sharp(file.path)
        .rotate()
        .resize(900, 900, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toFile(mediumLocalPath);

      createdFiles.push(mediumLocalPath);

      await sharp(file.path)
        .rotate()
        .resize(320, 320, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 76, effort: 4 })
        .toFile(thumbLocalPath);

      createdFiles.push(thumbLocalPath);

      const blurBuffer = await sharp(file.path)
        .rotate()
        .resize(20, 20, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 40, effort: 2 })
        .toBuffer();

      const blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

      if (deleteInputOnSuccess) {
        await safeUnlink(file.path);
      }

      results.push({
        imageId,
        original: `/${originalLocalPath.replace(/\\/g, "/")}`,
        medium: `/${mediumLocalPath.replace(/\\/g, "/")}`,
        thumbnail: `/${thumbLocalPath.replace(/\\/g, "/")}`,
        blurDataURL,
        alt: "",
      });
    }

    return results;
  } catch (error) {
    for (const filePath of createdFiles) {
      await safeUnlink(filePath);
    }

    if (deleteInputOnError) {
      for (const file of files) {
        await safeUnlink(file.path);
      }
    }

    throw error;
  }
};
