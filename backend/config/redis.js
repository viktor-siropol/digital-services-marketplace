import IORedis from "ioredis";

let redisConnection = null;

export const getRedisConnection = () => {
  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = process.env.REDIS_URL;

  redisConnection = redisUrl
    ? new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      })
    : new IORedis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: null,
      });

  redisConnection.on("error", (error) => {
    console.error("Redis connection error:", error.message);
  });

  return redisConnection;
};

export const closeRedisConnection = async () => {
  if (!redisConnection) return;

  await redisConnection.quit();
  redisConnection = null;
};
