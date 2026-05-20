import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";

const objectId = () => new mongoose.Types.ObjectId();

const createOrderDocument = (overrides = {}) =>
  new Order({
    user: objectId(),
    orderItems: [
      {
        product: objectId(),
        seller: objectId(),
        name: "Test product",
        image: "/uploads/test.webp",
        price: 100,
        qty: 2,
      },
    ],
    itemsPrice: 200,
    totalPrice: 200,
    ...overrides,
  });

describe("Order model", () => {
  it("sets payment, reservation, refund, and fulfillment defaults", () => {
    const order = createOrderDocument();

    expect(order.paymentMethod).toBe("paypal");
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.refundStatus).toBe("none");
    expect(order.reservationStatus).toBe("active");
    expect(order.orderStatus).toBe("placed");
    expect(order.isPaid).toBe(false);

    expect(order.orderItems[0].fulfillmentStatus).toBe("placed");
    expect(order.orderItems[0].shippedAt).toBeUndefined();
    expect(order.orderItems[0].deliveredAt).toBeUndefined();
  });

  it("requires at least one order item", () => {
    const order = createOrderDocument({
      orderItems: [],
    });

    const error = order.validateSync();

    expect(error.errors.orderItems.message).toBe(
      "Order must contain at least one item",
    );
  });

  it("rejects invalid payment status", () => {
    const order = createOrderDocument({
      paymentStatus: "unknown",
    });

    const error = order.validateSync();

    expect(error.errors.paymentStatus).toBeTruthy();
  });

  it("rejects invalid order status", () => {
    const order = createOrderDocument({
      orderStatus: "lost",
    });

    const error = order.validateSync();

    expect(error.errors.orderStatus).toBeTruthy();
  });

  it("rejects invalid item fulfillment status", () => {
    const order = createOrderDocument();

    order.orderItems[0].fulfillmentStatus = "lost";

    const error = order.validateSync();

    expect(error.errors["orderItems.0.fulfillmentStatus"]).toBeTruthy();
  });

  it("rejects item quantity below one", () => {
    const order = createOrderDocument();

    order.orderItems[0].qty = 0;

    const error = order.validateSync();

    expect(error.errors["orderItems.0.qty"]).toBeTruthy();
  });
});
