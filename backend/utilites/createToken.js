import jwt from "jsonwebtoken";
import { getAuthCookieOptions } from "./cookieOptions.js";

const createToken = (res, userId) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, jwtSecret, {
    expiresIn: "30d",
  });

  res.cookie("jwt", token, getAuthCookieOptions());

  return token;
};

export default createToken;
