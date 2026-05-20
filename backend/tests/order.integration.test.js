import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../utilites/paypal.js", () => ({
  getPayPalClientIdValue: vi.fn(() => "test-paypal-client-id"),
  createPayPalCheckoutOrder: vi.fn(async () => ({
    id: "paypal-order-123",
    status: "CREATED",
  })),
  capturePayPalCheckoutOrder: vi.fn(async () => ({
    id: "paypal-order-123",
    status: "COMPLETED",
    payer: {
      payer_id: "payer-123",
      email_address: "buyer@example.com",
    },
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: "capture-123",
              status: "COMPLETED",
            },
          ],
        },
      },
    ],
  })),
  refundPayPalCapturedPayment: vi.fn(async () => ({
    id: "refund-123",
    status: "COMPLETED",
    amount: {
      value: "200.00",
      currency_code: "USD",
    },
    update_time: "2026-01-05T10:00:00.000Z",
  })),
  verifyPayPalWebhookSignature: vi.fn(async () => ({
    verification_status: "SUCCESS",
  })),
}));

import { createApp } from "../app.js";
import orderRoutes from "../routes/orderRoutes.js";
import webhookRoutes from "../routes/webhookRoutes.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import {
  capturePayPalCheckoutOrder,
  createPayPalCheckoutOrder,
  refundPayPalCapturedPayment,
  verifyPayPalWebhookSignature,
} from "../utilites/paypal.js";
import { clearTestDB, closeTestDB, connectTestDB } from "./setupTestDB.js";

const objectId = () => new mongoose.Types.ObjectId();

const createAuthCookie = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  return `jwt=${token}`;
};

const createUser = ({
  username = "test user",
  email = "test@example.com",
  isSeller = false,
  isAdmin = false,
} = {}) =>
  User.create({
    username,
    email,
    password: "hashed-password",
    isSeller,
    isAdmin,
  });

const createProduct = ({
  seller,
  name = "Test product",
  price = 100,
  countInStock = 5,
} = {}) =>
  Product.create({
    seller,
    name,
    slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    images: [
      {
        imageId: "image-1",
        original: "/uploads/original.webp",
        medium: "/uploads/medium.webp",
        thumbnail: "/uploads/thumb.webp",
        blurDataURL: "",
        alt: name,
      },
    ],
    status: "ready",
    brand: "Test brand",
    category: objectId(),
    price,
    quantity: countInStock,
    countInStock,
    description: "Test description",
  });

const createPaidOrder = async ({ user, product, seller, qty = 2 } = {}) =>
  Order.create({
    user,
    orderItems: [
      {
        product,
        seller,
        name: "Paid product",
        image: "/uploads/thumb.webp",
        price: 100,
        qty,
        fulfillmentStatus: "processing",
      },
    ],
    itemsPrice: 100 * qty,
    totalPrice: 100 * qty,
    paymentMethod: "paypal",
    paymentStatus: "paid",
    paymentResult: {
      paypalOrderId: "paypal-order-123",
      paypalCaptureId: "capture-123",
      payerId: "payer-123",
      payerEmail: "buyer@example.com",
      status: "COMPLETED",
    },
    refundStatus: "none",
    reservationStatus: "converted",
    orderStatus: "processing",
    isPaid: true,
    paidAt: new Date("2026-01-01T10:00:00.000Z"),
  });

describe("order API integration", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();

    app = createApp({
      routes: {
        orderRoutes,
        webhookRoutes,
      },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("creates an unpaid order with active reservation", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const response = await request(app)
      .post("/api/orders")
      .set("Cookie", createAuthCookie(customer._id))
      .send({
        orderItems: [
          {
            product: product._id.toString(),
            qty: 2,
          },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      paymentStatus: "unpaid",
      reservationStatus: "active",
      orderStatus: "placed",
      isPaid: false,
      totalPrice: 200,
    });

    expect(response.body.orderItems[0]).toMatchObject({
      product: product._id.toString(),
      seller: seller._id.toString(),
      qty: 2,
      fulfillmentStatus: "placed",
    });
  });

  it("blocks users from ordering their own product", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const response = await request(app)
      .post("/api/orders")
      .set("Cookie", createAuthCookie(seller._id))
      .send({
        orderItems: [
          {
            product: product._id.toString(),
            qty: 1,
          },
        ],
      })
      .expect(400);

    expect(response.body.message).toBe("You cannot order your own product");
  });

  it("blocks order creation when requested quantity exceeds available stock", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 1,
    });

    const response = await request(app)
      .post("/api/orders")
      .set("Cookie", createAuthCookie(customer._id))
      .send({
        orderItems: [
          {
            product: product._id.toString(),
            qty: 2,
          },
        ],
      })
      .expect(409);

    expect(response.body.message).toContain("only has 1 unit");
  });

  it("creates a PayPal order for an active unpaid local order", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const orderResponse = await request(app)
      .post("/api/orders")
      .set("Cookie", createAuthCookie(customer._id))
      .send({
        orderItems: [
          {
            product: product._id.toString(),
            qty: 2,
          },
        ],
      })
      .expect(201);

    const response = await request(app)
      .post(`/api/orders/${orderResponse.body._id}/paypal/create`)
      .set("Cookie", createAuthCookie(customer._id))
      .send()
      .expect(200);

    expect(response.body.paypalOrderId).toBe("paypal-order-123");
    expect(createPayPalCheckoutOrder).toHaveBeenCalledWith({
      amount: 200,
      localOrderId: orderResponse.body._id,
    });
  });

  it("captures PayPal payment, marks order paid, and decrements stock", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const orderResponse = await request(app)
      .post("/api/orders")
      .set("Cookie", createAuthCookie(customer._id))
      .send({
        orderItems: [
          {
            product: product._id.toString(),
            qty: 2,
          },
        ],
      })
      .expect(201);

    await request(app)
      .post(`/api/orders/${orderResponse.body._id}/paypal/create`)
      .set("Cookie", createAuthCookie(customer._id))
      .send()
      .expect(200);

    const response = await request(app)
      .put(`/api/orders/${orderResponse.body._id}/paypal/capture`)
      .set("Cookie", createAuthCookie(customer._id))
      .send({
        paypalOrderId: "paypal-order-123",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      paymentStatus: "paid",
      reservationStatus: "converted",
      isPaid: true,
      orderStatus: "processing",
    });

    expect(response.body.paymentResult).toMatchObject({
      paypalOrderId: "paypal-order-123",
      paypalCaptureId: "capture-123",
      payerId: "payer-123",
      payerEmail: "buyer@example.com",
      status: "COMPLETED",
    });

    expect(capturePayPalCheckoutOrder).toHaveBeenCalledWith("paypal-order-123");

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.countInStock).toBe(3);
  });

  it("cancels an unpaid active order", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const orderResponse = await request(app)
      .post("/api/orders")
      .set("Cookie", createAuthCookie(customer._id))
      .send({
        orderItems: [
          {
            product: product._id.toString(),
            qty: 1,
          },
        ],
      })
      .expect(201);

    const response = await request(app)
      .put(`/api/orders/${orderResponse.body._id}/cancel`)
      .set("Cookie", createAuthCookie(customer._id))
      .send()
      .expect(200);

    expect(response.body).toMatchObject({
      orderStatus: "cancelled",
      reservationStatus: "released",
    });
  });

  it("blocks cancelling a paid order", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const order = await createPaidOrder({
      user: customer._id,
      seller: seller._id,
      product: product._id,
    });

    const response = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set("Cookie", createAuthCookie(customer._id))
      .send()
      .expect(409);

    expect(response.body.message).toBe(
      "Paid orders cannot be cancelled from this screen",
    );
  });

  it("allows seller to advance their own item fulfillment status", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const order = await createPaidOrder({
      user: customer._id,
      seller: seller._id,
      product: product._id,
    });

    const response = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set("Cookie", createAuthCookie(seller._id))
      .send({
        productId: product._id.toString(),
        nextStatus: "shipped",
      })
      .expect(200);

    expect(response.body.orderItems[0]).toMatchObject({
      product: product._id.toString(),
      fulfillmentStatus: "shipped",
      nextAllowedStatus: "delivered",
    });

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.orderItems[0].fulfillmentStatus).toBe("shipped");
  });

  it("blocks unrelated seller from updating someone else's item", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const otherSeller = await createUser({
      username: "other seller",
      email: "other@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 5,
    });

    const order = await createPaidOrder({
      user: customer._id,
      seller: seller._id,
      product: product._id,
    });

    const response = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set("Cookie", createAuthCookie(otherSeller._id))
      .send({
        productId: product._id.toString(),
        nextStatus: "shipped",
      })
      .expect(403);

    expect(response.body.message).toBe(
      "Not authorized to manage this order item",
    );
  });

  it("refunds a paid order as admin and restocks inventory", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const admin = await createUser({
      username: "admin",
      email: "admin@example.com",
      isAdmin: true,
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 3,
    });

    const order = await createPaidOrder({
      user: customer._id,
      seller: seller._id,
      product: product._id,
      qty: 2,
    });

    const response = await request(app)
      .put(`/api/orders/${order._id}/refund`)
      .set("Cookie", createAuthCookie(admin._id))
      .send({
        reason: "Test refund",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      paymentStatus: "refunded",
      refundStatus: "completed",
      orderStatus: "cancelled",
    });

    expect(response.body.refundResult).toMatchObject({
      paypalRefundId: "refund-123",
      status: "COMPLETED",
      amount: 200,
      currencyCode: "USD",
      reason: "Test refund",
      refundedBy: admin._id.toString(),
    });

    expect(refundPayPalCapturedPayment).toHaveBeenCalledWith("capture-123");

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.countInStock).toBe(5);
  });

  it("handles verified PayPal refund webhook", async () => {
    const seller = await createUser({
      username: "seller",
      email: "seller@example.com",
      isSeller: true,
    });

    const customer = await createUser({
      username: "customer",
      email: "customer@example.com",
    });

    const product = await createProduct({
      seller: seller._id,
      countInStock: 3,
    });

    const order = await createPaidOrder({
      user: customer._id,
      seller: seller._id,
      product: product._id,
      qty: 1,
    });

    await request(app)
      .post("/api/webhooks/paypal")
      .send({
        event_type: "PAYMENT.CAPTURE.REFUNDED",
        resource: {
          id: "refund-123",
          status: "COMPLETED",
          amount: {
            value: "100.00",
            currency_code: "USD",
          },
          update_time: "2026-01-05T10:00:00.000Z",
          supplementary_data: {
            related_ids: {
              capture_id: "capture-123",
              order_id: "paypal-order-123",
            },
          },
        },
      })
      .expect(200);

    expect(verifyPayPalWebhookSignature).toHaveBeenCalled();

    const updatedOrder = await Order.findById(order._id);

    expect(updatedOrder.paymentStatus).toBe("refunded");
    expect(updatedOrder.refundStatus).toBe("completed");
    expect(updatedOrder.refundedAt).toBeTruthy();
  });
});
