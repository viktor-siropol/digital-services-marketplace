import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const imageQueue = new Queue("image-processing", {
  connection: redisConnection,
});
