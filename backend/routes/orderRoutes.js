import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
} from "../controllers/orderController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(authenticate, createOrder);
router.route("/mine").get(authenticate, getMyOrders);
router.route("/:id").get(authenticate, getOrderById);

export default router;
