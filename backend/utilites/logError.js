export const logError = ({
  level = "error",
  scope = "unknown",
  message = "Unknown error",
  error = null,
  meta = {},
}) => {
  const payload = {
    level,
    scope,
    message,
    errorMessage: error?.message || null,
    stack: error?.stack || null,
    ...meta,
  };

  if (level === "warn") {
    console.warn("[app-log]", payload);
    return;
  }

  if (level === "info") {
    console.info("[app-log]", payload);
    return;
  }

  console.error("[app-log]", payload);
};
