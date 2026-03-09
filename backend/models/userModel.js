import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    isSeller: { type: Boolean, required: true, default: false },
    isAdmin: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
