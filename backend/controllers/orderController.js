import asyncHandler from "../middlewares/asyncHandler.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { formatOrderForClient } from "../utilites/formatOrderForClient.js";
import { logError } from "../utilites/logError.js";

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
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user.toString() === req.user._id.toString();

  if (!isOwner && !req.user.isAdmin) {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json(formatOrderForClient(order));
});
