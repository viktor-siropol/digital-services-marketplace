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

ensureDir("uploads/products/original");
ensureDir("uploads/products/medium");
ensureDir("uploads/products/thumb");

const safeUnlink = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {}
};

export const processProductImages = async (files) => {
  const results = [];
  const createdFiles = [];

  try {
    for (const file of files) {
      const imageId = randomUUID();

      const baseName = path.parse(file.filename).name;
      const webpFileName = `${baseName}.webp`;

      const originalLocalPath = path.join(
        "uploads/products/original",
        webpFileName,
      );
      const mediumLocalPath = path.join(
        "uploads/products/medium",
        webpFileName,
      );
      const thumbLocalPath = path.join("uploads/products/thumb", webpFileName);

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

      await safeUnlink(file.path);

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

    for (const file of files) {
      await safeUnlink(file.path);
    }

    throw error;
  }
};
