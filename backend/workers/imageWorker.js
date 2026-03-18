import path from "path";
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import Product from "../models/productModel.js";
import { processProductImages } from "../utilities/processProductImages.js";
import { localFilesExist } from "../utilities/deleteLocalImageSet.js";

const imageWorker = new Worker(
  "image-processing",
  async (job) => {
    const { productId } = job.data;

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.status === "ready" && product.images.length > 0) {
      return;
    }

    if (!product.tempUploads || product.tempUploads.length === 0) {
      throw new Error("No temp uploads found for product");
    }

    const inputsExist = await localFilesExist(product.tempUploads);

    if (!inputsExist) {
      product.status = "failed";
      product.processingError =
        "Temp upload files are missing. Retry requires re-upload.";
      await product.save();

      throw new Error("Temp upload files are missing");
    }

    const files = product.tempUploads.map((filePath) => ({
      path: filePath,
      filename: path.basename(filePath),
    }));

    try {
      const processedImages = await processProductImages(files, {
        deleteInputOnSuccess: true,
        deleteInputOnError: false,
      });

      product.images = processedImages;
      product.tempUploads = [];
      product.processingError = "";
      product.status = "ready";

      await product.save();
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      const isLastAttempt = job.attemptsMade + 1 >= maxAttempts;

      product.processingError = error.message;
      product.status = isLastAttempt ? "failed" : "processing";

      await product.save();

      throw error;
    }
  },
  {
    connection: redisConnection,
  },
);

imageWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

imageWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

imageWorker.on("error", (err) => {
  console.error("Worker error:", err.message);
});

console.log("Image worker is running...");
