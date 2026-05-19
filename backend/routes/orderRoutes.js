import express from "express";
import {
  cancelOrder,
  capturePayPalOrder,
  createOrder,
  createPayPalOrder,
  getMyOrders,
  getMySalesOrders,
  getOrderById,
  getPayPalClientId,
  getSalesOrderById,
  refundOrder,
  updateSellerOrderStatus,
} from "../controllers/orderController.js";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";
import {
  cancelOrderRateLimiter,
  createOrderRateLimiter,
  paymentActionRateLimiter,
} from "../middlewares/rateLimiters.js";

const router = express.Router();

router.route("/").post(authenticate, createOrderRateLimiter, createOrder);

router.get("/mine", authenticate, getMyOrders);
router.get("/sales", authenticate, getMySalesOrders);
router.get("/sales/:id", authenticate, getSalesOrderById);
router.get("/paypal/client-id", authenticate, getPayPalClientId);

router.put("/:id/cancel", authenticate, cancelOrderRateLimiter, cancelOrder);
router.put("/:id/status", authenticate, updateSellerOrderStatus);
router.put("/:id/refund", authenticate, authorizeAdmin, refundOrder);

router.post(
  "/:id/paypal/create",
  authenticate,
  paymentActionRateLimiter,
  createPayPalOrder,
);
router.put(
  "/:id/paypal/capture",
  authenticate,
  paymentActionRateLimiter,
  capturePayPalOrder,
);

router.route("/:id").get(authenticate, getOrderById);

export default router;
