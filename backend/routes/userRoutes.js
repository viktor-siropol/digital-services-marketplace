import express from "express";
import {
  createUser,
  LoginUser,
  LogoutUser,
  getAllUsers,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  deleteUserByID,
  getUserById,
  updateUserProfileById,
} from "../controllers/userController.js";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";
import {
  loginRateLimiter,
  registerRateLimiter,
} from "../middlewares/rateLimiters.js";
import {
  loginAbuseProtection,
  registerAbuseProtection,
} from "../middlewares/authAbuseProtection.js";

const router = express.Router();

router
  .route("/")
  .post(registerRateLimiter, registerAbuseProtection, createUser)
  .get(authenticate, authorizeAdmin, getAllUsers);

router.route("/auth").post(loginRateLimiter, loginAbuseProtection, LoginUser);
router.route("/logout").post(LogoutUser);

router
  .route("/profile")
  .get(authenticate, getCurrentUserProfile)
  .put(authenticate, updateCurrentUserProfile);

router
  .route("/:id")
  .get(authenticate, authorizeAdmin, getUserById)
  .put(authenticate, authorizeAdmin, updateUserProfileById)
  .delete(authenticate, authorizeAdmin, deleteUserByID);

export default router;
