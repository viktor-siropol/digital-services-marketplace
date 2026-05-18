import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  createProductReview,
  updateProduct,
  deleteProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getMyProductById,
  retryProductImageProcessing,
  getPublicProductsBrowse,
} from "../controllers/productController.js";
import { uploadProductImages } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getPublicProducts)
  .post(authenticate, uploadProductImages, createProduct);

router.get("/browse", getPublicProductsBrowse);
router.get("/p/:id", getPublicProductById);
router.post("/:id/reviews", authenticate, createProductReview);

router.get("/mine", authenticate, getMyProducts);
router.get("/manage/:id", authenticate, getMyProductById);

router.post("/:id/retry-processing", authenticate, retryProductImageProcessing);

router
  .route("/:id")
  .put(authenticate, uploadProductImages, updateProduct)
  .delete(authenticate, deleteProduct);

export default router;
