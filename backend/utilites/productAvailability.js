import mongoose from "mongoose";
import Order from "../models/orderModel.js";

export const ORDER_RESERVATION_WINDOW_MINUTES = 30;

const ACTIVE_RESERVATION_MATCH = {
  paymentStatus: "unpaid",
  isPaid: false,
  reservationStatus: "active",
};

const toPlainProduct = (product) =>
  product?.toObject ? product.toObject() : product;

export const getOrderReservationExpiryDate = () =>
  new Date(Date.now() + ORDER_RESERVATION_WINDOW_MINUTES * 60 * 1000);

export const expireExpiredOrderReservations = async () => {
  const now = new Date();

  const result = await Order.updateMany(
    {
      ...ACTIVE_RESERVATION_MATCH,
      expiresAt: { $lte: now },
    },
    {
      $set: {
        reservationStatus: "expired",
        orderStatus: "expired",
      },
    },
  );

  return result?.modifiedCount || 0;
};

export const getReservedQuantityMap = async (productIds = []) => {
  const normalizedIds = productIds
    .map((id) => id?.toString?.() ?? id)
    .filter(Boolean)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!normalizedIds.length) {
    return new Map();
  }

  const objectIds = normalizedIds.map((id) => new mongoose.Types.ObjectId(id));

  const reservations = await Order.aggregate([
    {
      $match: {
        ...ACTIVE_RESERVATION_MATCH,
        expiresAt: { $gt: new Date() },
        "orderItems.product": { $in: objectIds },
      },
    },
    { $unwind: "$orderItems" },
    {
      $match: {
        "orderItems.product": { $in: objectIds },
      },
    },
    {
      $group: {
        _id: "$orderItems.product",
        reservedQty: { $sum: "$orderItems.qty" },
      },
    },
  ]);

  return new Map(
    reservations.map((entry) => [
      entry._id.toString(),
      Number(entry.reservedQty || 0),
    ]),
  );
};

export const getAvailableStockValue = ({ countInStock = 0, reservedQty = 0 }) =>
  Math.max(0, Number(countInStock || 0) - Number(reservedQty || 0));

export const decorateProductsWithAvailability = async (products = []) => {
  const plainProducts = products.map(toPlainProduct);

  if (!plainProducts.length) {
    return [];
  }

  const reservedQuantityMap = await getReservedQuantityMap(
    plainProducts.map((product) => product._id),
  );

  return plainProducts.map((product) => {
    const productId = product._id?.toString?.() ?? product._id;
    const reservedQty = reservedQuantityMap.get(productId) || 0;

    return {
      ...product,
      availableStock: getAvailableStockValue({
        countInStock: product.countInStock,
        reservedQty,
      }),
    };
  });
};
