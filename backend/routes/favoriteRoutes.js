import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  addProductToFavorites,
  getMyFavoriteProducts,
  removeProductFromFavorites,
} from "../controllers/favoriteController.js";

const router = express.Router();

router.route("/").get(authenticate, getMyFavoriteProducts);
router.route("/:productId").post(authenticate, addProductToFavorites);
router.route("/:productId").delete(authenticate, removeProductFromFavorites);

export default router;
