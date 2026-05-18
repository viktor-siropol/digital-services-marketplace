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
import {
  expireExpiredOrderReservations,
  getAvailableStockValue,
  getOrderReservationExpiryDate,
  getReservedQuantityMap,
} from "../utilites/productAvailability.js";

const FULFILLMENT_TRANSITIONS = {
  placed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

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
        scope: "orderController.rollbackDecrementedStock",
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

const decrementOrderStockForPayment = async (order) => {
  const decrementedProducts = [];

  try {
    for (const item of order.orderItems) {
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
          `${item.name} is no longer available in the reserved quantity`,
        );
      }

      decrementedProducts.push({
        productId: item.product,
        qty: item.qty,
      });
    }

    return decrementedProducts;
  } catch (error) {
    await rollbackDecrementedStock(decrementedProducts);
    throw error;
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

const assertOrderOwner = (
  order,
  user,
  message = "Not authorized to access this order",
) => {
  const isOwner = order.user.toString() === user._id.toString();

  if (!isOwner) {
    throw createHttpError(403, message);
  }
};

const assertOrderOwnerForPayment = (order, user) => {
  assertOrderOwner(order, user, "Not authorized to pay for this order");
};

const assertOrderReservationActiveForPayment = (order) => {
  if (order.isPaid || order.paymentStatus === "paid") {
    return;
  }

  if (order.orderStatus === "cancelled") {
    throw createHttpError(
      409,
      "This order was cancelled and can no longer be paid",
    );
  }

  if (
    order.reservationStatus === "expired" ||
    order.orderStatus === "expired"
  ) {
    throw createHttpError(
      409,
      "This order reservation expired. Please place a new order.",
    );
  }

  if (order.reservationStatus !== "active") {
    throw createHttpError(409, "This order is no longer available for payment");
  }

  if (!order.expiresAt || new Date(order.expiresAt).getTime() <= Date.now()) {
    throw createHttpError(
      409,
      "This order reservation expired. Please place a new order.",
    );
  }
};

const getUniqueSellerIds = (order) => [
  ...new Set(
    (Array.isArray(order?.orderItems) ? order.orderItems : [])
      .map((item) => item?.seller?.toString?.())
      .filter(Boolean),
  ),
];

const getSellerLifecycleAccess = (order, user) => {
  if (user.isAdmin) {
    return {
      canManageLifecycle: true,
      lifecycleBlockedReason: "",
    };
  }

  if (!user.isSeller) {
    throw createHttpError(403, "Not authorized to manage seller order status");
  }

  const uniqueSellerIds = getUniqueSellerIds(order);
  const currentSellerId = user._id.toString();

  if (!uniqueSellerIds.includes(currentSellerId)) {
    throw createHttpError(403, "Not authorized to manage this order");
  }

  if (uniqueSellerIds.length > 1) {
    return {
      canManageLifecycle: false,
      lifecycleBlockedReason:
        "This order contains products from multiple sellers. Global fulfillment updates are locked for mixed-seller orders.",
    };
  }

  return {
    canManageLifecycle: true,
    lifecycleBlockedReason: "",
  };
};

const getLifecycleBlockedReasonForResponse = (order, user) => {
  try {
    const lifecycleAccess = getSellerLifecycleAccess(order, user);

    if (!lifecycleAccess.canManageLifecycle) {
      return lifecycleAccess.lifecycleBlockedReason;
    }

    if (!order?.isPaid || order?.paymentStatus !== "paid") {
      return "Fulfillment can start only after payment is completed.";
    }

    if (order?.orderStatus === "cancelled") {
      return "This order was cancelled and can no longer be advanced.";
    }

    if (order?.orderStatus === "expired") {
      return "This order reservation expired before payment.";
    }

    if (!FULFILLMENT_TRANSITIONS[order?.orderStatus]) {
      return "This order is already in its final fulfillment state.";
    }

    return "";
  } catch {
    return "You cannot manage the lifecycle of this order.";
  }
};

const formatSalesOrderForSeller = (order, user) => {
  const sellerId = user?._id?.toString?.() || "";
  const isAdmin = Boolean(user?.isAdmin);

  const rawOrderItems = Array.isArray(order?.orderItems)
    ? order.orderItems
    : [];

  const sellerItems = isAdmin
    ? rawOrderItems
    : rawOrderItems.filter((item) => item?.seller?.toString?.() === sellerId);

  const sellerItemsPrice = sellerItems.reduce(
    (sum, item) => sum + Number(item?.price || 0) * Number(item?.qty || 0),
    0,
  );

  const lifecycleBlockedReason = getLifecycleBlockedReasonForResponse(
    order,
    user,
  );

  const nextAllowedStatus = lifecycleBlockedReason
    ? ""
    : FULFILLMENT_TRANSITIONS[order?.orderStatus] || "";

  return {
    _id: order?._id?.toString?.() ?? order?._id,
    orderItems: sellerItems.map((item) => ({
      product: item?.product?._id
        ? item.product._id.toString()
        : (item?.product?.toString?.() ?? item?.product ?? ""),
      seller: item?.seller?._id
        ? item.seller._id.toString()
        : (item?.seller?.toString?.() ?? item?.seller ?? ""),
      name: item?.name || "",
      image: item?.image || "",
      price: Number(item?.price || 0),
      qty: Number(item?.qty || 0),
    })),
    itemsPrice: Number(sellerItemsPrice.toFixed(2)),
    totalPrice: Number(sellerItemsPrice.toFixed(2)),
    paymentMethod: order?.paymentMethod || "paypal",
    paymentStatus: order?.paymentStatus || "unpaid",
    orderStatus: order?.orderStatus || "placed",
    reservationStatus: order?.reservationStatus || "active",
    expiresAt: order?.expiresAt || null,
    isPaid: Boolean(order?.isPaid),
    paidAt: order?.paidAt || null,
    deliveredAt: order?.deliveredAt || null,
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    canManageLifecycle: !lifecycleBlockedReason,
    lifecycleBlockedReason,
    nextAllowedStatus,
  };
};

export const createOrder = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const { orderItems } = req.body;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    res.status(400);
    throw new Error("Order items are required");
  }

  try {
    const productIds = [
      ...new Set(
        orderItems
          .map((item) => item?.product?.toString?.() ?? item?.product)
          .filter(Boolean),
      ),
    ];

    const products = await Product.find({
      _id: { $in: productIds },
      status: "ready",
    }).select("_id seller name images price countInStock");

    const productsById = new Map(
      products.map((product) => [product._id.toString(), product]),
    );

    const reservedQuantityMap = await getReservedQuantityMap(productIds);

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
        throw createHttpError(
          400,
          "Each order item must have a valid quantity",
        );
      }

      if (product.seller.toString() === req.user._id.toString()) {
        throw createHttpError(400, "You cannot order your own product");
      }

      const reservedQty = reservedQuantityMap.get(productId) || 0;
      const availableStock = getAvailableStockValue({
        countInStock: product.countInStock,
        reservedQty,
      });

      if (requestedQty > availableStock) {
        throw createHttpError(
          409,
          `${product.name} only has ${availableStock} unit${
            availableStock === 1 ? "" : "s"
          } currently available`,
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

    const order = await Order.create({
      user: req.user._id,
      orderItems: normalizedOrderItems,
      itemsPrice,
      totalPrice: itemsPrice,
      paymentMethod: "paypal",
      paymentStatus: "unpaid",
      orderStatus: "placed",
      reservationStatus: "active",
      expiresAt: getOrderReservationExpiryDate(),
      isPaid: false,
    });

    res.status(201).json(formatOrderForClient(order));
  } catch (error) {
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
  await expireExpiredOrderReservations();

  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.json(orders.map((order) => formatOrderForClient(order)));
});

export const getOrderById = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

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
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  assertOrderOwnerForPayment(order, req.user);

  if (order.isPaid || order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("Order is already paid");
  }

  assertOrderReservationActiveForPayment(order);

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
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  assertOrderOwnerForPayment(order, req.user);

  if (order.isPaid || order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("Order is already paid");
  }

  assertOrderReservationActiveForPayment(order);

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

  let decrementedProducts = [];

  try {
    decrementedProducts = await decrementOrderStockForPayment(order);

    const captureResult = await capturePayPalCheckoutOrder(paypalOrderId);

    if (captureResult.status !== "COMPLETED") {
      await rollbackDecrementedStock(decrementedProducts);

      res.status(400);
      throw new Error("PayPal payment was not completed");
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = "paid";
    order.paymentMethod = "paypal";
    order.reservationStatus = "converted";

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
    if (decrementedProducts.length > 0) {
      await rollbackDecrementedStock(decrementedProducts);
    }

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

export const cancelOrder = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  assertOrderOwner(order, req.user, "Not authorized to cancel this order");

  if (order.orderStatus === "cancelled") {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  if (
    order.orderStatus === "expired" ||
    order.reservationStatus === "expired"
  ) {
    res.status(409);
    throw new Error("Expired orders cannot be cancelled");
  }

  if (order.isPaid || order.paymentStatus === "paid") {
    res.status(409);
    throw new Error("Paid orders cannot be cancelled from this screen");
  }

  if (order.reservationStatus !== "active") {
    res.status(409);
    throw new Error("This order is no longer active");
  }

  if (order.orderStatus !== "placed") {
    res.status(409);
    throw new Error("Only newly placed unpaid orders can be cancelled");
  }

  order.orderStatus = "cancelled";
  order.reservationStatus = "released";
  order.expiresAt = new Date();

  const updatedOrder = await order.save();

  res.json(formatOrderForClient(updatedOrder));
});

export const updateSellerOrderStatus = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  const lifecycleAccess = getSellerLifecycleAccess(order, req.user);

  if (!lifecycleAccess.canManageLifecycle) {
    res.status(409);
    throw new Error(lifecycleAccess.lifecycleBlockedReason);
  }

  if (!order.isPaid || order.paymentStatus !== "paid") {
    res.status(409);
    throw new Error("Order fulfillment can only start after payment");
  }

  if (order.orderStatus === "cancelled") {
    res.status(409);
    throw new Error("Cancelled orders cannot be advanced");
  }

  if (order.orderStatus === "expired") {
    res.status(409);
    throw new Error("Expired orders cannot be advanced");
  }

  const expectedNextStatus = FULFILLMENT_TRANSITIONS[order.orderStatus];

  if (!expectedNextStatus) {
    res.status(409);
    throw new Error("This order is already in its final lifecycle state");
  }

  const requestedNextStatus = req.body?.nextStatus?.toString().trim();

  if (requestedNextStatus && requestedNextStatus !== expectedNextStatus) {
    res.status(409);
    throw new Error(
      `Invalid status transition. Expected next status: ${expectedNextStatus}`,
    );
  }

  order.orderStatus = expectedNextStatus;

  if (expectedNextStatus === "delivered") {
    order.deliveredAt = new Date();
  }

  const updatedOrder = await order.save();

  res.json(formatOrderForClient(updatedOrder));
});

export const getMySalesOrders = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  if (!req.user.isSeller && !req.user.isAdmin) {
    res.status(403);
    throw new Error("Not authorized to view seller orders");
  }

  const salesQuery = req.user.isAdmin
    ? {}
    : { "orderItems.seller": req.user._id };

  const orders = await Order.find(salesQuery).sort({
    createdAt: -1,
  });

  res.json(orders.map((order) => formatSalesOrderForSeller(order, req.user)));
});

export const getSalesOrderById = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  getSellerLifecycleAccess(order, req.user);

  res.json(formatSalesOrderForSeller(order, req.user));
});
