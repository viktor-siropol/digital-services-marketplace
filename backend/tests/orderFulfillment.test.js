import { describe, expect, it } from "vitest";
import {
  buildSellerItemCounts,
  ensureOrderItemFulfillmentState,
  getItemFulfillmentStatus,
  getNextItemFulfillmentStatus,
  recalculateOrderLifecycleState,
} from "../utilites/orderFulfillment.js";

const createPaidOrder = (overrides = {}) => ({
  isPaid: true,
  paymentStatus: "paid",
  refundStatus: "none",
  orderStatus: "processing",
  paidAt: new Date("2026-01-01T10:00:00.000Z"),
  updatedAt: new Date("2026-01-01T11:00:00.000Z"),
  deliveredAt: null,
  orderItems: [
    {
      product: "product-1",
      fulfillmentStatus: "processing",
      shippedAt: null,
      deliveredAt: null,
    },
  ],
  ...overrides,
});

describe("order fulfillment utilities", () => {
  it("returns the next item fulfillment status", () => {
    expect(getNextItemFulfillmentStatus("placed")).toBe("processing");
    expect(getNextItemFulfillmentStatus("processing")).toBe("shipped");
    expect(getNextItemFulfillmentStatus("shipped")).toBe("delivered");
    expect(getNextItemFulfillmentStatus("delivered")).toBe("");
  });

  it("derives legacy item status from a paid processing order", () => {
    const order = createPaidOrder({
      orderStatus: "processing",
      orderItems: [
        {
          product: "product-1",
        },
      ],
    });

    expect(getItemFulfillmentStatus(order.orderItems[0], order)).toBe(
      "processing",
    );
  });

  it("backfills missing item fulfillment state for legacy orders", () => {
    const order = createPaidOrder({
      orderStatus: "shipped",
      orderItems: [
        {
          product: "product-1",
        },
      ],
    });

    const changed = ensureOrderItemFulfillmentState(order);

    expect(changed).toBe(true);
    expect(order.orderItems[0].fulfillmentStatus).toBe("shipped");
    expect(order.orderItems[0].shippedAt).toEqual(order.updatedAt);
  });

  it("sets aggregate order status to processing when at least one item is processing", () => {
    const order = createPaidOrder({
      orderItems: [
        {
          product: "product-1",
          fulfillmentStatus: "processing",
        },
        {
          product: "product-2",
          fulfillmentStatus: "shipped",
          shippedAt: new Date("2026-01-02T10:00:00.000Z"),
        },
      ],
    });

    recalculateOrderLifecycleState(order);

    expect(order.orderStatus).toBe("processing");
    expect(order.deliveredAt).toBeUndefined();
  });

  it("sets aggregate order status to shipped when all items are shipped or delivered", () => {
    const order = createPaidOrder({
      orderItems: [
        {
          product: "product-1",
          fulfillmentStatus: "shipped",
          shippedAt: new Date("2026-01-02T10:00:00.000Z"),
        },
        {
          product: "product-2",
          fulfillmentStatus: "delivered",
          shippedAt: new Date("2026-01-02T10:00:00.000Z"),
          deliveredAt: new Date("2026-01-03T10:00:00.000Z"),
        },
      ],
    });

    recalculateOrderLifecycleState(order);

    expect(order.orderStatus).toBe("shipped");
    expect(order.deliveredAt).toBeUndefined();
  });

  it("sets aggregate order status to delivered when all items are delivered", () => {
    const firstDeliveredAt = new Date("2026-01-03T10:00:00.000Z");
    const secondDeliveredAt = new Date("2026-01-04T10:00:00.000Z");

    const order = createPaidOrder({
      orderItems: [
        {
          product: "product-1",
          fulfillmentStatus: "delivered",
          deliveredAt: firstDeliveredAt,
        },
        {
          product: "product-2",
          fulfillmentStatus: "delivered",
          deliveredAt: secondDeliveredAt,
        },
      ],
    });

    recalculateOrderLifecycleState(order);

    expect(order.orderStatus).toBe("delivered");
    expect(order.deliveredAt).toEqual(secondDeliveredAt);
  });

  it("does not mark refunded undelivered orders as fulfilled", () => {
    const order = createPaidOrder({
      paymentStatus: "refunded",
      refundStatus: "completed",
      orderStatus: "processing",
      orderItems: [
        {
          product: "product-1",
          fulfillmentStatus: "processing",
        },
      ],
    });

    recalculateOrderLifecycleState(order);

    expect(order.orderStatus).toBe("cancelled");
  });

  it("keeps already delivered refunded orders as delivered", () => {
    const order = createPaidOrder({
      paymentStatus: "refunded",
      refundStatus: "completed",
      orderStatus: "delivered",
      orderItems: [
        {
          product: "product-1",
          fulfillmentStatus: "delivered",
          deliveredAt: new Date("2026-01-03T10:00:00.000Z"),
        },
      ],
    });

    recalculateOrderLifecycleState(order);

    expect(order.orderStatus).toBe("delivered");
  });

  it("builds seller item counts by fulfillment status", () => {
    const items = [
      { fulfillmentStatus: "processing" },
      { fulfillmentStatus: "processing" },
      { fulfillmentStatus: "shipped" },
      { fulfillmentStatus: "delivered" },
    ];

    expect(buildSellerItemCounts(items)).toEqual({
      placed: 0,
      processing: 2,
      shipped: 1,
      delivered: 1,
    });
  });
});
