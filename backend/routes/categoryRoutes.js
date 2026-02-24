import express from "express";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router
  .route("/")
  .get(authenticate, authorizeAdmin, getCategories)
  .post(authenticate, authorizeAdmin, createCategory);

router
  .route("/:id")
  .delete(authenticate, authorizeAdmin, deleteCategory)
  .put(authenticate, authorizeAdmin, updateCategory);

export default router;
