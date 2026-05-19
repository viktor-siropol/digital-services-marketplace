import express from "express";
import { handlePayPalWebhook } from "../controllers/orderController.js";

const router = express.Router();

router.post("/paypal", handlePayPalWebhook);

export default router;
