import { describe, expect, it } from "vitest";
import { formatOrderForClient } from "../utilites/formatOrderForClient.js";

const createBaseOrder = (overrides = {}) => ({
  _id: "order-1",
  user: "user-1",
  orderItems: [
    {
      product: "product-1",
      seller: "seller-1",
      name: "Test product",
      image: "/uploads/test.webp",
      price: 100,
      qty: 2,
    },
  ],
  itemsPrice: 200,
  totalPrice: 200,
  paymentMethod: "paypal",
  paymentStatus: "unpaid",
  paymentResult: {},
  refundStatus: "none",
  refundResult: {},
  reservationStatus: "active",
  expiresAt: null,
  orderStatus: "placed",
  isPaid: false,
  paidAt: null,
  refundedAt: null,
  deliveredAt: null,
  inventoryRestockedAt: null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  updatedAt: new Date("2026-01-01T10:00:00.000Z"),
  ...overrides,
});

describe("formatOrderForClient", () => {
  it("returns basic order fields in client-safe shape", () => {
    const formatted = formatOrderForClient(createBaseOrder());

    expect(formatted._id).toBe("order-1");
    expect(formatted.user).toBe("user-1");
    expect(formatted.orderItems).toHaveLength(1);
    expect(formatted.orderItems[0]).toMatchObject({
      product: "product-1",
      seller: "seller-1",
      name: "Test product",
      image: "/uploads/test.webp",
      price: 100,
      qty: 2,
      fulfillmentStatus: "placed",
    });
    expect(formatted.totalPrice).toBe(200);
    expect(formatted.paymentStatus).toBe("unpaid");
  });

  it("exposes refund and restock metadata", () => {
    const formatted = formatOrderForClient(
      createBaseOrder({
        paymentStatus: "refunded",
        refundStatus: "completed",
        refundResult: {
          paypalRefundId: "refund-123",
          status: "COMPLETED",
          amount: 200,
          currencyCode: "USD",
          reason: "Admin initiated refund",
          refundedBy: "admin-1",
        },
        refundedAt: new Date("2026-01-02T10:00:00.000Z"),
        inventoryRestockedAt: new Date("2026-01-02T10:05:00.000Z"),
      }),
    );

    expect(formatted.paymentStatus).toBe("refunded");
    expect(formatted.refundStatus).toBe("completed");
    expect(formatted.refundResult).toMatchObject({
      paypalRefundId: "refund-123",
      status: "COMPLETED",
      amount: 200,
      currencyCode: "USD",
      reason: "Admin initiated refund",
      refundedBy: "admin-1",
    });
    expect(formatted.refundedAt).toEqual(new Date("2026-01-02T10:00:00.000Z"));
    expect(formatted.inventoryRestockedAt).toEqual(
      new Date("2026-01-02T10:05:00.000Z"),
    );
  });

  it("derives legacy item fulfillment status from shipped order status", () => {
    const formatted = formatOrderForClient(
      createBaseOrder({
        isPaid: true,
        paymentStatus: "paid",
        orderStatus: "shipped",
        orderItems: [
          {
            product: "product-1",
            seller: "seller-1",
            name: "Legacy product",
            image: "",
            price: 50,
            qty: 1,
          },
        ],
      }),
    );

    expect(formatted.orderItems[0].fulfillmentStatus).toBe("shipped");
  });

  it("preserves explicit item fulfillment status and timestamps", () => {
    const shippedAt = new Date("2026-01-03T10:00:00.000Z");
    const deliveredAt = new Date("2026-01-04T10:00:00.000Z");

    const formatted = formatOrderForClient(
      createBaseOrder({
        isPaid: true,
        paymentStatus: "paid",
        orderStatus: "delivered",
        orderItems: [
          {
            product: "product-1",
            seller: "seller-1",
            name: "Delivered product",
            image: "",
            price: 80,
            qty: 1,
            fulfillmentStatus: "delivered",
            shippedAt,
            deliveredAt,
          },
        ],
      }),
    );

    expect(formatted.orderItems[0].fulfillmentStatus).toBe("delivered");
    expect(formatted.orderItems[0].shippedAt).toEqual(shippedAt);
    expect(formatted.orderItems[0].deliveredAt).toEqual(deliveredAt);
  });
});
