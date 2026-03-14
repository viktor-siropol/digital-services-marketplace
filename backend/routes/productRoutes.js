import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.route("/").post(authenticate, upload.array("images", 8), createProduct);

router
  .route("/:id")
  .put(authenticate, upload.array("images", 8), updateProduct)
  .delete(authenticate, deleteProduct);

export default router;
