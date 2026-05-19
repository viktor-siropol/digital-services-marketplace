import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  addProductToFavorites,
  getMyFavoriteProducts,
  removeProductFromFavorites,
} from "../controllers/favoriteController.js";
import { favoriteMutationRateLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

router.route("/").get(authenticate, getMyFavoriteProducts);
router
  .route("/:productId")
  .post(authenticate, favoriteMutationRateLimiter, addProductToFavorites)
  .delete(
    authenticate,
    favoriteMutationRateLimiter,
    removeProductFromFavorites,
  );

export default router;
