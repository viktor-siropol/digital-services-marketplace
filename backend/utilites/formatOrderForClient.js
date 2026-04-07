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
    itemsPrice: raw.itemsPrice ?? 0,
    totalPrice: raw.totalPrice ?? 0,
    paymentMethod: raw.paymentMethod || "paypal",
    paymentStatus: raw.paymentStatus || "unpaid",
    orderStatus: raw.orderStatus || "placed",
    isPaid: Boolean(raw.isPaid),
    paidAt: raw.paidAt || null,
    deliveredAt: raw.deliveredAt || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};
