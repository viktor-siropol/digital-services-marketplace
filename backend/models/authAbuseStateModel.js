import mongoose from "mongoose";

const authAbuseStateSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["login", "register"],
      required: true,
      index: true,
    },

    keyType: {
      type: String,
      enum: ["ip", "account"],
      required: true,
    },

    identifier: {
      type: String,
      required: true,
      trim: true,
    },

    failCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    firstFailedAt: {
      type: Date,
    },

    lastFailedAt: {
      type: Date,
    },

    blockedUntil: {
      type: Date,
    },
  },
  { timestamps: true },
);

authAbuseStateSchema.index(
  { scope: 1, keyType: 1, identifier: 1 },
  { unique: true },
);

authAbuseStateSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

const AuthAbuseState = mongoose.model("AuthAbuseState", authAbuseStateSchema);

export default AuthAbuseState;
