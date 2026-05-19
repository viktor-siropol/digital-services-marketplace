const getLegacyFulfillmentStatus = (item = {}, rawOrder = {}) => {
  if (item.fulfillmentStatus) {
    return item.fulfillmentStatus;
  }

  if (rawOrder.orderStatus === "delivered") {
    return "delivered";
  }

  if (rawOrder.orderStatus === "shipped") {
    return "shipped";
  }

  if (
    rawOrder.orderStatus === "processing" ||
    (rawOrder.isPaid && rawOrder.paymentStatus === "paid")
  ) {
    return "processing";
  }

  return "placed";
};

const formatOrderItemForClient = (item = {}, rawOrder = {}) => ({
  product: item.product?._id
    ? item.product._id.toString()
    : (item.product?.toString?.() ?? item.product),
  seller: item.seller?._id
    ? item.seller._id.toString()
    : (item.seller?.toString?.() ?? item.seller),
  name: item.name,
  image: item.image || "",
  price: item.price,
  qty: item.qty,
  fulfillmentStatus: getLegacyFulfillmentStatus(item, rawOrder),
  shippedAt: item.shippedAt || null,
  deliveredAt: item.deliveredAt || null,
});

const formatPaymentResultForClient = (paymentResult = {}) => ({
  paypalOrderId: paymentResult.paypalOrderId || "",
  paypalCaptureId: paymentResult.paypalCaptureId || "",
  payerId: paymentResult.payerId || "",
  payerEmail: paymentResult.payerEmail || "",
  status: paymentResult.status || "",
});

const formatRefundResultForClient = (refundResult = {}) => ({
  paypalRefundId: refundResult.paypalRefundId || "",
  status: refundResult.status || "",
  amount: Number(refundResult.amount || 0),
  currencyCode: refundResult.currencyCode || "USD",
  reason: refundResult.reason || "",
  refundedBy: refundResult.refundedBy || "",
});

export const formatOrderForClient = (order) => {
  const raw = order?.toObject ? order.toObject() : order;

  return {
    _id: raw._id?.toString?.() ?? raw._id,
    user: raw.user?._id
      ? raw.user._id.toString()
      : (raw.user?.toString?.() ?? raw.user),
    orderItems: Array.isArray(raw.orderItems)
      ? raw.orderItems.map((item) => formatOrderItemForClient(item, raw))
      : [],
    itemsPrice: Number(raw.itemsPrice || 0),
    totalPrice: Number(raw.totalPrice || 0),
    paymentMethod: raw.paymentMethod || "paypal",
    paymentStatus: raw.paymentStatus || "unpaid",
    paymentResult: formatPaymentResultForClient(raw.paymentResult),
    refundStatus: raw.refundStatus || "none",
    refundResult: formatRefundResultForClient(raw.refundResult),
    reservationStatus: raw.reservationStatus || "active",
    expiresAt: raw.expiresAt || null,
    orderStatus: raw.orderStatus || "placed",
    isPaid: Boolean(raw.isPaid),
    paidAt: raw.paidAt || null,
    refundedAt: raw.refundedAt || null,
    deliveredAt: raw.deliveredAt || null,
    inventoryRestockedAt: raw.inventoryRestockedAt || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
};
