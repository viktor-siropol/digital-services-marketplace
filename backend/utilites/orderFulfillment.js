export const ITEM_FULFILLMENT_TRANSITIONS = {
  placed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

export const getLegacyItemFulfillmentStatusFromOrder = (order = {}) => {
  if (order.orderStatus === "delivered") return "delivered";
  if (order.orderStatus === "shipped") return "shipped";

  if (
    order.orderStatus === "processing" ||
    (order.isPaid && order.paymentStatus === "paid")
  ) {
    return "processing";
  }

  return "placed";
};

export const getItemFulfillmentStatus = (item = {}, order = null) => {
  if (item.fulfillmentStatus) {
    return item.fulfillmentStatus;
  }

  return getLegacyItemFulfillmentStatusFromOrder(order || {});
};

export const getNextItemFulfillmentStatus = (status = "placed") => {
  return ITEM_FULFILLMENT_TRANSITIONS[status] || "";
};

export const ensureOrderItemFulfillmentState = (order) => {
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
      (order.updatedAt || order.paidAt)
    ) {
      item.shippedAt = order.updatedAt || order.paidAt;
      changed = true;
    }

    if (
      item.fulfillmentStatus === "delivered" &&
      !item.deliveredAt &&
      (order.deliveredAt || order.updatedAt || order.paidAt)
    ) {
      item.deliveredAt = order.deliveredAt || order.updatedAt || order.paidAt;
      changed = true;
    }
  });

  return changed;
};

export const recalculateOrderLifecycleState = (order) => {
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

export const buildSellerItemCounts = (items = [], order = null) => {
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
