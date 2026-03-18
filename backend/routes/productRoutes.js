import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getMyProductById,
  retryProductImageProcessing,
} from "../controllers/productController.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getPublicProducts)
  .post(authenticate, upload.array("images", 8), createProduct);

router.get("/mine", authenticate, getMyProducts);
router.get("/manage/:id", authenticate, getMyProductById);
router.get("/p/:id/:slug?", getPublicProductById);

router.post("/:id/retry-processing", authenticate, retryProductImageProcessing);

router
  .route("/:id")
  .put(authenticate, upload.array("images", 8), updateProduct)
  .delete(authenticate, deleteProduct);

export default router;
