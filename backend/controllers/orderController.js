import mongoose from "mongoose";
import asyncHandler from "../middlewares/asyncHandler.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { formatOrderForClient } from "../utilites/formatOrderForClient.js";
import { logError } from "../utilites/logError.js";
import {
  capturePayPalCheckoutOrder,
  createPayPalCheckoutOrder,
  getPayPalClientIdValue,
  refundPayPalCapturedPayment,
  verifyPayPalWebhookSignature,
} from "../utilites/paypal.js";
import {
  expireExpiredOrderReservations,
  getAvailableStockValue,
  getOrderReservationExpiryDate,
  getReservedQuantityMap,
} from "../utilites/productAvailability.js";

const ITEM_FULFILLMENT_TRANSITIONS = {
  placed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const getOrderItemProductId = (item = {}) =>
  item?.product?._id
    ? item.product._id.toString()
    : (item?.product?.toString?.() ?? "");

const getOrderItemSellerId = (item = {}) =>
  item?.seller?._id
    ? item.seller._id.toString()
    : (item?.seller?.toString?.() ?? "");

const getLegacyItemFulfillmentStatusFromOrder = (order) => {
  if (order?.orderStatus === "delivered") return "delivered";
  if (order?.orderStatus === "shipped") return "shipped";

  if (
    order?.orderStatus === "processing" ||
    (order?.isPaid && order?.paymentStatus === "paid")
  ) {
    return "processing";
  }

  return "placed";
};

const getItemFulfillmentStatus = (item = {}, order = null) => {
  if (item?.fulfillmentStatus) {
    return item.fulfillmentStatus;
  }

  return getLegacyItemFulfillmentStatusFromOrder(order);
};

const ensureOrderItemFulfillmentState = (order) => {
  if (!Array.isArray(order?.orderItems)) {
    return false;
  }

  const fallbackStatus = getLegacyItemFulfillmentStatusFromOrder(order);
  let changed = false;

  order.orderItems.forEach((item) => {
    if (!item.fulfillmentStatus) {
      item.fulfillmentStatus = fallbackStatus;
      changed = true;
    }

    if (
      item.fulfillmentStatus === "shipped" &&
      !item.shippedAt &&
      (order?.updatedAt || order?.paidAt)
    ) {
      item.shippedAt = order.updatedAt || order.paidAt;
      changed = true;
    }

    if (
      item.fulfillmentStatus === "delivered" &&
      !item.deliveredAt &&
      (order?.deliveredAt || order?.updatedAt || order?.paidAt)
    ) {
      item.deliveredAt = order.deliveredAt || order.updatedAt || order.paidAt;
      changed = true;
    }
  });

  return changed;
};

const recalculateOrderLifecycleState = (order) => {
  if (!order) return;

  if (
    order.refundStatus === "completed" ||
    order.paymentStatus === "refunded"
  ) {
    if (order.orderStatus !== "delivered") {
      order.orderStatus = "cancelled";
    }
    return;
  }

  if (order.orderStatus === "cancelled" && !order.isPaid) {
    return;
  }

  if (order.orderStatus === "expired") {
    return;
  }

  if (!order.isPaid || order.paymentStatus !== "paid") {
    order.orderStatus = "placed";
    order.deliveredAt = undefined;
    return;
  }

  const itemStatuses = Array.isArray(order.orderItems)
    ? order.orderItems.map((item) => getItemFulfillmentStatus(item, order))
    : [];

  if (!itemStatuses.length) {
    order.orderStatus = "processing";
    order.deliveredAt = undefined;
    return;
  }

  if (itemStatuses.every((status) => status === "delivered")) {
    order.orderStatus = "delivered";

    const deliveredTimes = order.orderItems
      .map((item) =>
        item.deliveredAt ? new Date(item.deliveredAt).getTime() : 0,
      )
      .filter(Boolean);

    order.deliveredAt = deliveredTimes.length
      ? new Date(Math.max(...deliveredTimes))
      : order.deliveredAt || new Date();

    return;
  }

  if (
    itemStatuses.every((status) => ["shipped", "delivered"].includes(status))
  ) {
    order.orderStatus = "shipped";
    order.deliveredAt = undefined;
    return;
  }

  order.orderStatus = "processing";
  order.deliveredAt = undefined;
};

const syncOrderFulfillmentState = async (order) => {
  if (!order) return order;

  const hadLegacyItems = ensureOrderItemFulfillmentState(order);
  const previousOrderStatus = order.orderStatus;
  const previousDeliveredAt = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : 0;

  recalculateOrderLifecycleState(order);

  const nextDeliveredAt = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : 0;

  if (
    hadLegacyItems ||
    previousOrderStatus !== order.orderStatus ||
    previousDeliveredAt !== nextDeliveredAt
  ) {
    await order.save();
  }

  return order;
};

const getItemLifecycleAccess = ({ order, item, user }) => {
  const isAdmin = Boolean(user?.isAdmin);
  const currentSellerId = user?._id?.toString?.() || "";
  const itemSellerId = getOrderItemSellerId(item);

  if (!isAdmin && !user?.isSeller) {
    throw createHttpError(403, "Not authorized to manage seller order status");
  }

  if (!isAdmin && itemSellerId !== currentSellerId) {
    throw createHttpError(403, "Not authorized to manage this order item");
  }

  if (!order?.isPaid || order?.paymentStatus !== "paid") {
    return {
      canManageLifecycle: false,
      lifecycleBlockedReason:
        "Fulfillment can start only after payment is completed.",
      nextAllowedStatus: "",
    };
  }

  if (
    order?.paymentStatus === "refunded" ||
    order?.refundStatus === "completed"
  ) {
    return {
      canManageLifecycle: false,
      lifecycleBlockedReason: "Refunded orders can no longer be fulfilled.",
      nextAllowedStatus: "",
    };
  }

  if (order?.orderStatus === "cancelled") {
    return {
      canManageLifecycle: false,
      lifecycleBlockedReason:
        "This order was cancelled and can no longer be advanced.",
      nextAllowedStatus: "",
    };
  }

  if (order?.orderStatus === "expired") {
    return {
      canManageLifecycle: false,
      lifecycleBlockedReason: "This order reservation expired before payment.",
      nextAllowedStatus: "",
    };
  }

  const currentStatus = getItemFulfillmentStatus(item, order);
  const nextAllowedStatus = ITEM_FULFILLMENT_TRANSITIONS[currentStatus] || "";

  if (!nextAllowedStatus) {
    return {
      canManageLifecycle: false,
      lifecycleBlockedReason:
        "This item is already in its final fulfillment state.",
      nextAllowedStatus: "",
    };
  }

  return {
    canManageLifecycle: true,
    lifecycleBlockedReason: "",
    nextAllowedStatus,
  };
};

const buildSellerItemCounts = (items = [], order = null) => {
  return items.reduce(
    (acc, item) => {
      const status = getItemFulfillmentStatus(item, order);

      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {
      placed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
    },
  );
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

const getPayPalRelatedIds = (resource = {}) =>
  resource?.supplementary_data?.related_ids || {};

const mapRefundStatus = (status = "") => {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") return "completed";
  if (normalized === "PENDING") return "pending";
  return "failed";
};

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

const rollbackRestockedStock = async (restockedProducts = []) => {
  for (const item of restockedProducts) {
    try {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { countInStock: -item.qty } },
      );
    } catch (error) {
      logError({
        level: "error",
        scope: "orderController.rollbackRestockedStock",
        message: "Failed to rollback restocked stock",
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

const restockOrderItemsAfterRefund = async (order) => {
  if (order.inventoryRestockedAt) {
    return;
  }

  const restockedProducts = [];

  try {
    for (const item of order.orderItems) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { countInStock: item.qty } },
      );

      restockedProducts.push({
        productId: item.product,
        qty: item.qty,
      });
    }

    order.inventoryRestockedAt = new Date();
  } catch (error) {
    await rollbackRestockedStock(restockedProducts);
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
    : rawOrderItems.filter((item) => getOrderItemSellerId(item) === sellerId);

  const sellerItemsPrice = sellerItems.reduce(
    (sum, item) => sum + Number(item?.price || 0) * Number(item?.qty || 0),
    0,
  );

  const serializedItems = sellerItems.map((item) => {
    const lifecycleMeta = getItemLifecycleAccess({
      order,
      item,
      user,
    });

    return {
      product: getOrderItemProductId(item),
      seller: getOrderItemSellerId(item),
      name: item?.name || "",
      image: item?.image || "",
      price: Number(item?.price || 0),
      qty: Number(item?.qty || 0),
      fulfillmentStatus: getItemFulfillmentStatus(item, order),
      shippedAt: item?.shippedAt || null,
      deliveredAt: item?.deliveredAt || null,
      canManageLifecycle: lifecycleMeta.canManageLifecycle,
      lifecycleBlockedReason: lifecycleMeta.lifecycleBlockedReason,
      nextAllowedStatus: lifecycleMeta.nextAllowedStatus,
    };
  });

  const actionableItemsCount = serializedItems.filter(
    (item) => item.canManageLifecycle && item.nextAllowedStatus,
  ).length;

  const firstBlockedReason =
    serializedItems.find((item) => item.lifecycleBlockedReason)
      ?.lifecycleBlockedReason || "";

  return {
    _id: order?._id?.toString?.() ?? order?._id,
    orderItems: serializedItems,
    sellerItemCounts: buildSellerItemCounts(sellerItems, order),
    actionableItemsCount,
    itemsPrice: Number(sellerItemsPrice.toFixed(2)),
    totalPrice: Number(sellerItemsPrice.toFixed(2)),
    paymentMethod: order?.paymentMethod || "paypal",
    paymentStatus: order?.paymentStatus || "unpaid",
    refundStatus: order?.refundStatus || "none",
    refundResult: order?.refundResult || {},
    refundedAt: order?.refundedAt || null,
    orderStatus: order?.orderStatus || "placed",
    reservationStatus: order?.reservationStatus || "active",
    expiresAt: order?.expiresAt || null,
    isPaid: Boolean(order?.isPaid),
    paidAt: order?.paidAt || null,
    deliveredAt: order?.deliveredAt || null,
    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
    canManageLifecycle: actionableItemsCount > 0,
    lifecycleBlockedReason: actionableItemsCount > 0 ? "" : firstBlockedReason,
    nextAllowedStatus: "",
  };
};

const applyPaidCaptureState = (
  order,
  {
    paypalOrderId = "",
    paypalCaptureId = "",
    payerId = "",
    payerEmail = "",
    status = "COMPLETED",
    paidAt = new Date(),
  },
) => {
  order.isPaid = true;
  order.paidAt = order.paidAt || new Date(paidAt);
  order.paymentStatus = "paid";
  order.paymentMethod = "paypal";
  order.reservationStatus = "converted";

  order.orderItems.forEach((item) => {
    if (!item.fulfillmentStatus || item.fulfillmentStatus === "placed") {
      item.fulfillmentStatus = "processing";
    }
  });

  ensureOrderItemFulfillmentState(order);
  recalculateOrderLifecycleState(order);

  order.paymentResult = {
    paypalOrderId: paypalOrderId || order.paymentResult?.paypalOrderId || "",
    paypalCaptureId:
      paypalCaptureId || order.paymentResult?.paypalCaptureId || "",
    payerId: payerId || order.paymentResult?.payerId || "",
    payerEmail: payerEmail || order.paymentResult?.payerEmail || "",
    status: status || order.paymentResult?.status || "COMPLETED",
  };
};

const applyRefundStateToOrder = async (
  order,
  {
    paypalRefundId = "",
    status = "",
    amount = null,
    currencyCode = "USD",
    reason = "",
    refundedBy = "",
    refundedAt = new Date(),
  },
) => {
  const normalizedRefundStatus = mapRefundStatus(status);

  order.refundStatus = normalizedRefundStatus;
  order.refundResult = {
    paypalRefundId: paypalRefundId || order.refundResult?.paypalRefundId || "",
    status: status || order.refundResult?.status || "",
    amount:
      amount !== null
        ? Number(amount)
        : Number(order.refundResult?.amount || 0),
    currencyCode: currencyCode || order.refundResult?.currencyCode || "USD",
    reason: reason || order.refundResult?.reason || "",
    refundedBy: refundedBy || order.refundResult?.refundedBy || "",
  };

  if (normalizedRefundStatus === "completed") {
    order.paymentStatus = "refunded";
    order.refundedAt = order.refundedAt || new Date(refundedAt);

    if (order.orderStatus !== "delivered") {
      order.orderStatus = "cancelled";
    }

    await restockOrderItemsAfterRefund(order);
  }

  await order.save();

  return order;
};

const findOrderByCaptureWebhookResource = async (resource = {}) => {
  const relatedIds = getPayPalRelatedIds(resource);
  const paypalOrderId = relatedIds.order_id || "";
  const captureId = resource?.id || relatedIds.capture_id || "";
  const localOrderId = resource?.custom_id || "";

  if (captureId) {
    const orderByCaptureId = await Order.findOne({
      "paymentResult.paypalCaptureId": captureId,
    });

    if (orderByCaptureId) {
      return orderByCaptureId;
    }
  }

  if (paypalOrderId) {
    const orderByPayPalOrderId = await Order.findOne({
      "paymentResult.paypalOrderId": paypalOrderId,
    });

    if (orderByPayPalOrderId) {
      return orderByPayPalOrderId;
    }
  }

  if (localOrderId && mongoose.isValidObjectId(localOrderId)) {
    const orderByLocalId = await Order.findById(localOrderId);

    if (orderByLocalId) {
      return orderByLocalId;
    }
  }

  return null;
};

const findOrderByRefundWebhookResource = async (resource = {}) => {
  const relatedIds = getPayPalRelatedIds(resource);
  const refundId = resource?.id || "";
  const captureId = relatedIds.capture_id || "";
  const paypalOrderId = relatedIds.order_id || "";

  if (refundId) {
    const orderByRefundId = await Order.findOne({
      "refundResult.paypalRefundId": refundId,
    });

    if (orderByRefundId) {
      return orderByRefundId;
    }
  }

  if (captureId) {
    const orderByCaptureId = await Order.findOne({
      "paymentResult.paypalCaptureId": captureId,
    });

    if (orderByCaptureId) {
      return orderByCaptureId;
    }
  }

  if (paypalOrderId) {
    const orderByPayPalOrderId = await Order.findOne({
      "paymentResult.paypalOrderId": paypalOrderId,
    });

    if (orderByPayPalOrderId) {
      return orderByPayPalOrderId;
    }
  }

  return null;
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
        fulfillmentStatus: "placed",
        shippedAt: undefined,
        deliveredAt: undefined,
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
      refundStatus: "none",
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

  const syncedOrders = await Promise.all(
    orders.map(async (order) => syncOrderFulfillmentState(order)),
  );

  res.json(syncedOrders.map((order) => formatOrderForClient(order)));
});

export const getOrderById = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  assertOrderViewer(order, req.user);

  await syncOrderFulfillmentState(order);

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
      decrementedProducts = [];

      res.status(400);
      throw new Error("PayPal payment was not completed");
    }

    applyPaidCaptureState(order, {
      paypalOrderId,
      paypalCaptureId: getPayPalCaptureId(captureResult),
      payerId: captureResult?.payer?.payer_id || "",
      payerEmail: captureResult?.payer?.email_address || "",
      status: captureResult.status || "COMPLETED",
      paidAt: new Date(),
    });

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

export const refundOrder = asyncHandler(async (req, res) => {
  const order = await getOrderOrThrow(req.params.id);

  if (!order.isPaid || order.paymentStatus !== "paid") {
    res.status(409);
    throw new Error("Only paid orders can be refunded");
  }

  if (order.refundStatus === "pending") {
    res.status(409);
    throw new Error("This order already has a pending refund");
  }

  if (
    order.refundStatus === "completed" ||
    order.paymentStatus === "refunded"
  ) {
    res.status(409);
    throw new Error("This order has already been refunded");
  }

  const paypalCaptureId = order.paymentResult?.paypalCaptureId || "";

  if (!paypalCaptureId) {
    res.status(409);
    throw new Error("This order does not have a PayPal capture ID");
  }

  const refundReason =
    req.body?.reason?.toString().trim().slice(0, 200) ||
    "Admin initiated refund";

  try {
    const refundResult = await refundPayPalCapturedPayment(paypalCaptureId);

    const updatedOrder = await applyRefundStateToOrder(order, {
      paypalRefundId: refundResult?.id || "",
      status: refundResult?.status || "",
      amount: Number(refundResult?.amount?.value || order.totalPrice || 0),
      currencyCode: refundResult?.amount?.currency_code || "USD",
      reason: refundReason,
      refundedBy: req.user?._id?.toString() || "admin",
      refundedAt: refundResult?.update_time || new Date(),
    });

    res.json(formatOrderForClient(updatedOrder));
  } catch (error) {
    logError({
      level: "error",
      scope: "refundOrder",
      message: "Failed to refund PayPal capture",
      error,
      meta: {
        orderId: order._id.toString(),
        userId: req.user?._id?.toString(),
        paypalCaptureId,
      },
    });

    res.status(error.statusCode || 500);
    throw new Error(error.message || "Failed to refund order");
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

  ensureOrderItemFulfillmentState(order);

  const targetProductId = req.body?.productId?.toString?.().trim() || "";

  if (!targetProductId) {
    res.status(400);
    throw new Error("Product ID is required for item fulfillment updates");
  }

  const targetItem = order.orderItems.find(
    (item) => getOrderItemProductId(item) === targetProductId,
  );

  if (!targetItem) {
    res.status(404);
    throw new Error("Order item not found");
  }

  const lifecycleAccess = getItemLifecycleAccess({
    order,
    item: targetItem,
    user: req.user,
  });

  if (!lifecycleAccess.canManageLifecycle) {
    res.status(409);
    throw new Error(lifecycleAccess.lifecycleBlockedReason);
  }

  const requestedNextStatus = req.body?.nextStatus?.toString().trim();

  if (
    requestedNextStatus &&
    requestedNextStatus !== lifecycleAccess.nextAllowedStatus
  ) {
    res.status(409);
    throw new Error(
      `Invalid item transition. Expected next status: ${lifecycleAccess.nextAllowedStatus}`,
    );
  }

  const nextStatus = lifecycleAccess.nextAllowedStatus;

  targetItem.fulfillmentStatus = nextStatus;

  if (nextStatus === "shipped") {
    targetItem.shippedAt = new Date();
    targetItem.deliveredAt = undefined;
  }

  if (nextStatus === "delivered") {
    targetItem.shippedAt = targetItem.shippedAt || new Date();
    targetItem.deliveredAt = new Date();
  }

  recalculateOrderLifecycleState(order);

  const updatedOrder = await order.save();

  res.json(formatSalesOrderForSeller(updatedOrder, req.user));
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

  const syncedOrders = await Promise.all(
    orders.map(async (order) => syncOrderFulfillmentState(order)),
  );

  res.json(
    syncedOrders.map((order) => formatSalesOrderForSeller(order, req.user)),
  );
});

export const getSalesOrderById = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const order = await getOrderOrThrow(req.params.id);

  const hasVisibleSellerItems =
    req.user.isAdmin ||
    order.orderItems.some(
      (item) => getOrderItemSellerId(item) === req.user._id.toString(),
    );

  if (!hasVisibleSellerItems) {
    res.status(403);
    throw new Error("Not authorized to view this seller order");
  }

  await syncOrderFulfillmentState(order);

  res.json(formatSalesOrderForSeller(order, req.user));
});

export const handlePayPalWebhook = asyncHandler(async (req, res) => {
  const verification = await verifyPayPalWebhookSignature({
    headers: req.headers,
    webhookEvent: req.body,
  });

  if (verification?.verification_status !== "SUCCESS") {
    res.status(400);
    throw new Error("PayPal webhook signature verification failed");
  }

  const eventType = req.body?.event_type || "";
  const resource = req.body?.resource || {};
  const relatedIds = getPayPalRelatedIds(resource);

  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      const order = await findOrderByCaptureWebhookResource(resource);

      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }

      applyPaidCaptureState(order, {
        paypalOrderId: relatedIds.order_id || "",
        paypalCaptureId: resource?.id || "",
        status: resource?.status || "COMPLETED",
        paidAt: resource?.create_time || new Date(),
      });

      await order.save();

      return res.status(200).json({ received: true });
    }

    case "PAYMENT.CAPTURE.REFUNDED": {
      const order = await findOrderByRefundWebhookResource(resource);

      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }

      await applyRefundStateToOrder(order, {
        paypalRefundId: order.refundResult?.paypalRefundId || "",
        status: "COMPLETED",
        amount: Number(resource?.amount?.value || order.totalPrice || 0),
        currencyCode: resource?.amount?.currency_code || "USD",
        reason: order.refundResult?.reason || "",
        refundedBy: order.refundResult?.refundedBy || "paypal-webhook",
        refundedAt: resource?.update_time || new Date(),
      });

      return res.status(200).json({ received: true });
    }

    case "PAYMENT.REFUND.PENDING":
    case "PAYMENT.REFUND.FAILED": {
      const order = await findOrderByRefundWebhookResource(resource);

      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }

      await applyRefundStateToOrder(order, {
        paypalRefundId:
          resource?.id || order.refundResult?.paypalRefundId || "",
        status: eventType === "PAYMENT.REFUND.PENDING" ? "PENDING" : "FAILED",
        amount: Number(resource?.amount?.value || order.totalPrice || 0),
        currencyCode: resource?.amount?.currency_code || "USD",
        reason: order.refundResult?.reason || "",
        refundedBy: order.refundResult?.refundedBy || "paypal-webhook",
        refundedAt: resource?.update_time || new Date(),
      });

      return res.status(200).json({ received: true });
    }

    default:
      return res.status(200).json({ received: true, ignored: true });
  }
});
