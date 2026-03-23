import { logError } from "./logError.js";

export const logCleanupError = ({ scope, target, error, extra = {} }) => {
  logError({
    level: "error",
    scope,
    message: "Cleanup operation failed",
    error,
    meta: {
      target,
      ...extra,
    },
  });
};
