import { rateLimit } from "express-rate-limit";

const createJsonRateLimiter = ({
  windowMs,
  limit,
  message,
  statusCode = 429,
}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    statusCode,
    message: { message },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    },
  });

export const loginRateLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: "Too many login attempts. Please try again in 10 minutes.",
});

export const registerRateLimiter = createJsonRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts. Please try again in 1 hour.",
});

export const reviewRateLimiter = createJsonRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many review submissions. Please try again later.",
});

export const favoriteMutationRateLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: "Too many favorite actions. Please slow down and try again later.",
});

export const createOrderRateLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many order attempts. Please try again shortly.",
});

export const paymentActionRateLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many payment attempts. Please try again shortly.",
});

export const cancelOrderRateLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many cancel attempts. Please try again shortly.",
});
