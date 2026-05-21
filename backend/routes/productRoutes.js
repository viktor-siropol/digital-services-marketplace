import express from "express";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";
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
  getProductsPendingReview,
  approveProduct,
  rejectProduct,
} from "../controllers/productController.js";
import { uploadProductImages } from "../middlewares/uploadMiddleware.js";
import { reviewRateLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

router
  .route("/")
  .get(getPublicProducts)
  .post(authenticate, uploadProductImages, createProduct);

router.get("/browse", getPublicProductsBrowse);
router.get("/p/:id", getPublicProductById);
router.post(
  "/:id/reviews",
  authenticate,
  reviewRateLimiter,
  createProductReview,
);

router.get("/mine", authenticate, getMyProducts);
router.get("/manage/:id", authenticate, getMyProductById);

router.post("/:id/retry-processing", authenticate, retryProductImageProcessing);

router.get(
  "/admin/pending-review",
  authenticate,
  authorizeAdmin,
  getProductsPendingReview,
);

router.put("/admin/:id/approve", authenticate, authorizeAdmin, approveProduct);

router.put("/admin/:id/reject", authenticate, authorizeAdmin, rejectProduct);

router
  .route("/:id")
  .put(authenticate, uploadProductImages, updateProduct)
  .delete(authenticate, deleteProduct);

export default router;
