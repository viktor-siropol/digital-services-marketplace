const formatOrderItemForClient = (item = {}) => ({
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
});

const formatPaymentResultForClient = (paymentResult = {}) => ({
  paypalOrderId: paymentResult.paypalOrderId || "",
  paypalCaptureId: paymentResult.paypalCaptureId || "",
  payerId: paymentResult.payerId || "",
  payerEmail: paymentResult.payerEmail || "",
  status: paymentResult.status || "",
});

export const formatOrderForClient = (order) => {
  const raw = order?.toObject ? order.toObject() : order;

  return {
    _id: raw._id?.toString?.() ?? raw._id,
    user: raw.user?._id
      ? raw.user._id.toString()
      : (raw.user?.toString?.() ?? raw.user),
    orderItems: Array.isArray(raw.orderItems)
      ? raw.orderItems.map(formatOrderItemForClient)
      : [],
    itemsPrice: Number(raw.itemsPrice || 0),
    totalPrice: Number(raw.totalPrice || 0),
    paymentMethod: raw.paymentMethod || "paypal",
    paymentStatus: raw.paymentStatus || "unpaid",
    paymentResult: formatPaymentResultForClient(raw.paymentResult),
    reservationStatus: raw.reservationStatus || "active",
    expiresAt: raw.expiresAt || null,
    orderStatus: raw.orderStatus || "placed",
    isPaid: Boolean(raw.isPaid),
    paidAt: raw.paidAt || null,
    deliveredAt: raw.deliveredAt || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
};
