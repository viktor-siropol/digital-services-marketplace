import { logError } from "./logError.js";

export const logCleanupError = ({ scope, target, error, extra = {} }) => {
  const isMissingTarget = error?.code === "ENOENT";

  logError({
    level: isMissingTarget ? "warn" : "error",
    scope,
    message: isMissingTarget
      ? "Cleanup target was already missing"
      : "Cleanup operation failed",
    error,
    meta: {
      target,
      ...extra,
    },
  });
};
