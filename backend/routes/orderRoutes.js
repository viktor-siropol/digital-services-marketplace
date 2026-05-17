import express from "express";
import {
  capturePayPalOrder,
  createOrder,
  createPayPalOrder,
  getMyOrders,
  getMySalesOrders,
  getOrderById,
  getPayPalClientId,
} from "../controllers/orderController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/paypal/client-id").get(authenticate, getPayPalClientId);

router.route("/").post(authenticate, createOrder);
router.route("/mine").get(authenticate, getMyOrders);
router.route("/:id/paypal/create").post(authenticate, createPayPalOrder);
router.route("/:id/paypal/capture").post(authenticate, capturePayPalOrder);
router.route("/sales").get(authenticate, getMySalesOrders);
router.route("/:id").get(authenticate, getOrderById);

export default router;
