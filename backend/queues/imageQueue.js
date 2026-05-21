import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

let imageQueue = null;

const getImageQueue = () => {
  if (process.env.IMAGE_PROCESSING_MODE === "sync") {
    throw new Error(
      "Image queue is disabled because IMAGE_PROCESSING_MODE is set to sync",
    );
  }

  if (!imageQueue) {
    imageQueue = new Queue("image-processing", {
      connection: getRedisConnection(),
    });
  }

  return imageQueue;
};

const FAILED_TEMP_UPLOAD_TTL_MS =
  Number(process.env.FAILED_TEMP_UPLOAD_TTL_MS) || 24 * 60 * 60 * 1000;

export const enqueueImageProcessingJob = async (productId) => {
  await getImageQueue().add(
    "process-product-images",
    { productId },
    {
      jobId: `product-images-${productId}-${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  );
};

export const enqueueFailedTempUploadCleanupJob = async (productId) => {
  await getImageQueue().add(
    "cleanup-failed-temp-uploads",
    { productId },
    {
      jobId: `cleanup-failed-temp-uploads-${productId}`,
      delay: FAILED_TEMP_UPLOAD_TTL_MS,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: "fixed",
        delay: 5000,
      },
    },
  );
};

export { FAILED_TEMP_UPLOAD_TTL_MS };
