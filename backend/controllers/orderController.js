import asyncHandler from "../middlewares/asyncHandler.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { formatOrderForClient } from "../utilites/formatOrderForClient.js";
import { logError } from "../utilites/logError.js";
import {
  capturePayPalCheckoutOrder,
  createPayPalCheckoutOrder,
  getPayPalClientIdValue,
} from "../utilites/paypal.js";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getPrimaryProductImage = (product) =>
  product?.images?.[0]?.thumbnail ||
  product?.images?.[0]?.medium ||
  product?.images?.[0]?.original ||
  "";

const getPayPalCaptureId = (captureResponse) =>
  captureResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.id || "";

const rollbackDecrementedStock = async (decrementedProducts = []) => {
  for (const item of decrementedProducts) {
    try {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { countInStock: item.qty } },
      );
    } catch (error) {
      logError({
        level: "error",
        scope: "createOrder.rollbackDecrementedStock",
        message: "Failed to rollback decremented stock",
        error,
        meta: {
          productId: item.productId,
          qty: item.qty,
        },
      });
    }
  }
};

const getOrderOrThrow = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
};

const assertOrderViewer = (order, user) => {
  const isOwner = order.user.toString() === user._id.toString();

  if (!isOwner && !user.isAdmin) {
    throw createHttpError(403, "Not authorized to view this order");
  }

  return { isOwner };
};

const assertOrderOwnerForPayment = (order, user) => {
  const isOwner = order.user.toString() === user._id.toString();

  if (!isOwner) {
    throw createHttpError(403, "Not authorized to pay for this order");
  }
};

export const createOrder = asyncHandler(async (req, res) => {
  const { orderItems } = req.body;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    res.status(400);
    throw new Error("Order items are required");
  }

  const productIds = [...new Set(orderItems.map((item) => item.product))];

  const products = await Product.find({
    _id: { $in: productIds },
    status: "ready",
  }).select("_id seller name images price countInStock");

  const productsById = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const normalizedOrderItems = orderItems.map((item) => {
    const productId = item?.product?.toString?.() ?? item?.product;
    const requestedQty = Number(item?.qty || 0);
    const product = productsById.get(productId);

    if (!product) {
      throw createHttpError(
        400,
        "One or more products are no longer available",
      );
    }

    if (!Number.isInteger(requestedQty) || requestedQty < 1) {
      throw createHttpError(400, "Each order item must have a valid quantity");
    }

    if (product.seller.toString() === req.user._id.toString()) {
      throw createHttpError(400, "You cannot order your own product");
    }

    if (requestedQty > Number(product.countInStock || 0)) {
      throw createHttpError(
        409,
        `${product.name} does not have enough stock available`,
      );
    }

    return {
      product: product._id,
      seller: product.seller,
      name: product.name,
      image: getPrimaryProductImage(product),
      price: Number(product.price),
      qty: requestedQty,
    };
  });

  const itemsPrice = Number(
    normalizedOrderItems
      .reduce((sum, item) => sum + item.price * item.qty, 0)
      .toFixed(2),
  );

  const decrementedProducts = [];

  try {
    for (const item of normalizedOrderItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          status: "ready",
          countInStock: { $gte: item.qty },
        },
        {
          $inc: { countInStock: -item.qty },
        },
        { new: true },
      );

      if (!updatedProduct) {
        throw createHttpError(
          409,
          `${item.name} is no longer available in the requested quantity`,
        );
      }

      decrementedProducts.push({
        productId: item.product,
        qty: item.qty,
      });
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems: normalizedOrderItems,
      itemsPrice,
      totalPrice: itemsPrice,
      paymentMethod: "paypal",
      paymentStatus: "unpaid",
      orderStatus: "placed",
      isPaid: false,
    });

    res.status(201).json(formatOrderForClient(order));
  } catch (error) {
    await rollbackDecrementedStock(decrementedProducts);

    if (!error.statusCode || error.statusCode >= 500) {
      logError({
        level: "error",
        scope: "createOrder",
        message: "Failed to create order",
        error,
        meta: {
          userId: req.user?._id?.toString(),
        },
      });
    }

    res.status(error.statusCode || 500);
    throw new Error(error.message || "Failed to create order");
  }
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.json(orders.map((order) => formatOrderForClient(order)));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await getOrderOrThrow(req.params.id);

  assertOrderViewer(order, req.user);

  res.json(formatOrderForClient(order));
});

export const getPayPalClientId = asyncHandler(async (req, res) => {
  const clientId = getPayPalClientIdValue();

  if (!clientId) {
    res.status(500);
    throw new Error("PayPal client ID is not configured");
  }

  res.json({ clientId });
});

export const createPayPalOrder = asyncHandler(async (req, res) => {
  const order = await getOrderOrThrow(req.params.id);

  assertOrderOwnerForPayment(order, req.user);

  if (order.isPaid || order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("Order is already paid");
  }

  if (Number(order.totalPrice || 0) <= 0) {
    res.status(400);
    throw new Error("Order total must be greater than zero");
  }

  try {
    const paypalOrder = await createPayPalCheckoutOrder({
      amount: order.totalPrice,
      localOrderId: order._id.toString(),
    });

    order.paymentResult = {
      paypalOrderId: paypalOrder.id || "",
      paypalCaptureId: order.paymentResult?.paypalCaptureId || "",
      payerId: order.paymentResult?.payerId || "",
      payerEmail: order.paymentResult?.payerEmail || "",
      status: paypalOrder.status || "CREATED",
    };

    await order.save();

    res.json({
      paypalOrderId: paypalOrder.id,
    });
  } catch (error) {
    logError({
      level: "error",
      scope: "createPayPalOrder",
      message: "Failed to create PayPal order",
      error,
      meta: {
        userId: req.user?._id?.toString(),
        orderId: order._id.toString(),
      },
    });

    res.status(error.statusCode || 500);
    throw new Error(error.message || "Failed to create PayPal order");
  }
});

export const capturePayPalOrder = asyncHandler(async (req, res) => {
  const order = await getOrderOrThrow(req.params.id);

  assertOrderOwnerForPayment(order, req.user);

  if (order.isPaid || order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("Order is already paid");
  }

  const paypalOrderId =
    req.body?.paypalOrderId || order.paymentResult?.paypalOrderId || "";

  if (!paypalOrderId) {
    res.status(400);
    throw new Error("Missing PayPal order ID");
  }

  if (
    order.paymentResult?.paypalOrderId &&
    order.paymentResult.paypalOrderId !== paypalOrderId
  ) {
    res.status(409);
    throw new Error("PayPal order ID does not match the pending payment");
  }

  try {
    const captureResult = await capturePayPalCheckoutOrder(paypalOrderId);

    if (captureResult.status !== "COMPLETED") {
      res.status(400);
      throw new Error("PayPal payment was not completed");
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = "paid";
    order.paymentMethod = "paypal";

    if (order.orderStatus === "placed") {
      order.orderStatus = "processing";
    }

    order.paymentResult = {
      paypalOrderId,
      paypalCaptureId: getPayPalCaptureId(captureResult),
      payerId: captureResult?.payer?.payer_id || "",
      payerEmail: captureResult?.payer?.email_address || "",
      status: captureResult.status || "COMPLETED",
    };

    const updatedOrder = await order.save();

    res.json(formatOrderForClient(updatedOrder));
  } catch (error) {
    logError({
      level: "error",
      scope: "capturePayPalOrder",
      message: "Failed to capture PayPal order",
      error,
      meta: {
        userId: req.user?._id?.toString(),
        orderId: order._id.toString(),
        paypalOrderId,
      },
    });

    res.status(error.statusCode || 500);
    throw new Error(error.message || "Failed to capture PayPal payment");
  }
});

export const getMySalesOrders = asyncHandler(async (req, res) => {
  if (!req.user.isSeller && !req.user.isAdmin) {
    res.status(403);
    throw new Error("Not authorized to view seller orders");
  }

  const orders = await Order.find({
    "orderItems.seller": req.user._id,
  }).sort({
    createdAt: -1,
  });

  const salesOrders = orders.map((order) => {
    const sellerItems = order.orderItems.filter(
      (item) => item.seller.toString() === req.user._id.toString(),
    );

    const sellerItemsPrice = sellerItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    );

    return {
      _id: order._id,
      orderItems: sellerItems.map((item) => ({
        product: item.product,
        seller: item.seller,
        name: item.name,
        image: item.image || "",
        price: item.price,
        qty: item.qty,
      })),
      itemsPrice: Number(sellerItemsPrice.toFixed(2)),
      totalPrice: Number(sellerItemsPrice.toFixed(2)),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });

  res.json(salesOrders);
});