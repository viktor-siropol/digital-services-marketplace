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
  updateSellerOrderStatus,
} from "../controllers/orderController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(authenticate, createOrder);

router.get("/mine", authenticate, getMyOrders);
router.get("/sales", authenticate, getMySalesOrders);
router.get("/sales/:id", authenticate, getSalesOrderById);
router.get("/paypal/client-id", authenticate, getPayPalClientId);

router.put("/:id/cancel", authenticate, cancelOrder);
router.put("/:id/status", authenticate, updateSellerOrderStatus);

router.post("/:id/paypal/create", authenticate, createPayPalOrder);
router.put("/:id/paypal/capture", authenticate, capturePayPalOrder);

router.route("/:id").get(authenticate, getOrderById);

export default router;
