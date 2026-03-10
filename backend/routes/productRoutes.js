import express from "express";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";
import { createProduct } from "../controllers/productController.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(authenticate, authorizeAdmin, upload.array("images", 8), createProduct);

export default router;
