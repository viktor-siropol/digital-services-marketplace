import AuthAbuseState from "../models/authAbuseStateModel.js";

const OBSERVATION_WINDOW_MS = 15 * 60 * 1000;
const LOCK_THRESHOLD = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 30 * 60 * 1000;

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const getAccountIdentifier = (req) => {
  const email = normalizeEmail(req.body?.email || "");
  return email || "";
};

const buildIdentifiers = (req) => {
  const identifiers = [];

  if (req.ip) {
    identifiers.push({
      keyType: "ip",
      identifier: req.ip,
    });
  }

  const accountIdentifier = getAccountIdentifier(req);

  if (accountIdentifier) {
    identifiers.push({
      keyType: "account",
      identifier: accountIdentifier,
    });
  }

  return identifiers;
};

const computeBlockDurationMs = (failCount) => {
  if (failCount < LOCK_THRESHOLD) {
    return 0;
  }

  return Math.min(
    MAX_LOCK_MS,
    BASE_LOCK_MS * 2 ** (failCount - LOCK_THRESHOLD),
  );
};

const upsertFailureState = async ({ scope, keyType, identifier }) => {
  const now = new Date();

  let state = await AuthAbuseState.findOne({
    scope,
    keyType,
    identifier,
  });

  if (!state) {
    state = new AuthAbuseState({
      scope,
      keyType,
      identifier,
      failCount: 0,
    });
  }

  const lastFailedAtMs = state.lastFailedAt
    ? new Date(state.lastFailedAt).getTime()
    : 0;

  if (!lastFailedAtMs || Date.now() - lastFailedAtMs > OBSERVATION_WINDOW_MS) {
    state.failCount = 0;
    state.firstFailedAt = now;
  }

  state.failCount += 1;
  state.lastFailedAt = now;

  const blockDurationMs = computeBlockDurationMs(state.failCount);

  state.blockedUntil =
    blockDurationMs > 0 ? new Date(Date.now() + blockDurationMs) : undefined;

  await state.save();

  return state;
};

const clearFailureState = async ({ scope, keyType, identifier }) => {
  await AuthAbuseState.deleteOne({
    scope,
    keyType,
    identifier,
  });
};

const findActiveBlock = async ({ scope, keyType, identifier }) => {
  const state = await AuthAbuseState.findOne({
    scope,
    keyType,
    identifier,
  });

  if (!state?.blockedUntil) {
    return null;
  }

  if (new Date(state.blockedUntil).getTime() <= Date.now()) {
    return null;
  }

  return state;
};

const processPostResponse = async ({ scope, identifiers, statusCode }) => {
  try {
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const isCountedFailure =
      statusCode >= 400 && statusCode < 500 && statusCode !== 429;

    if (isSuccess) {
      await Promise.all(
        identifiers.map((item) =>
          clearFailureState({
            scope,
            keyType: item.keyType,
            identifier: item.identifier,
          }),
        ),
      );

      return;
    }

    if (isCountedFailure) {
      await Promise.all(
        identifiers.map((item) =>
          upsertFailureState({
            scope,
            keyType: item.keyType,
            identifier: item.identifier,
          }),
        ),
      );
    }
  } catch (error) {
    console.error("Auth abuse protection post-response error:", error.message);
  }
};

const createAuthAbuseProtection = (scope) => async (req, res, next) => {
  try {
    const identifiers = buildIdentifiers(req);

    const activeBlocks = await Promise.all(
      identifiers.map((item) =>
        findActiveBlock({
          scope,
          keyType: item.keyType,
          identifier: item.identifier,
        }),
      ),
    );

    const blockingState = activeBlocks
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.blockedUntil).getTime() -
          new Date(a.blockedUntil).getTime(),
      )[0];

    if (blockingState) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (new Date(blockingState.blockedUntil).getTime() - Date.now()) / 1000,
        ),
      );

      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        message: `Too many ${scope} failures. Try again in ${retryAfterSeconds} seconds.`,
      });
    }

    res.on("finish", () => {
      void processPostResponse({
        scope,
        identifiers,
        statusCode: res.statusCode,
      });
    });

    next();
  } catch (error) {
    next(error);
  }
};

export const loginAbuseProtection = createAuthAbuseProtection("login");
export const registerAbuseProtection = createAuthAbuseProtection("register");
