import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const paymentResultSchema = new mongoose.Schema(
  {
    paypalOrderId: {
      type: String,
      default: "",
    },

    paypalCaptureId: {
      type: String,
      default: "",
    },

    payerId: {
      type: String,
      default: "",
    },

    payerEmail: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "Order must contain at least one item",
      },
    },

    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["paypal"],
      default: "paypal",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },

    paymentResult: {
      type: paymentResultSchema,
      default: () => ({}),
    },

    reservationStatus: {
      type: String,
      enum: ["active", "converted", "expired", "released"],
      default: "active",
      index: true,
    },

    expiresAt: {
      type: Date,
      index: true,
    },

    orderStatus: {
      type: String,
      enum: [
        "placed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "expired",
      ],
      default: "placed",
      index: true,
    },

    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },

    paidAt: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

orderSchema.index({ reservationStatus: 1, expiresAt: 1, paymentStatus: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
