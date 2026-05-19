import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  useCancelOrderMutation,
  useCapturePayPalOrderMutation,
  useCreatePayPalOrderMutation,
  useGetOrderByIdQuery,
  useGetPayPalClientIdQuery,
} from "../../redux/api/orderApiSlice";

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
};

const paymentStatusStyles = {
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-slate-100 text-slate-700 border-slate-200",
};

const orderStatusStyles = {
  placed: "bg-sky-50 text-sky-700 border-sky-200",
  processing: "bg-violet-50 text-violet-700 border-violet-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
};

const fulfillmentStatusStyles = {
  placed: "bg-slate-100 text-slate-700 border-slate-200",
  processing: "bg-violet-50 text-violet-700 border-violet-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const formatFulfillmentLabel = (value) => {
  if (value === "placed") return "Placed";
  if (value === "processing") return "Processing";
  if (value === "shipped") return "Shipped";
  if (value === "delivered") return "Delivered";
  return "Placed";
};

const getOrderJourneySteps = (order) => {
  const orderStatus = order?.orderStatus || "placed";
  const isPaid = Boolean(order?.isPaid);
  const isExpired =
    order?.reservationStatus === "expired" || orderStatus === "expired";
  const isCancelled = orderStatus === "cancelled";

  if (isCancelled) {
    return [
      {
        key: "placed",
        label: "Order placed",
        description: "We received your order successfully.",
        state: "done",
      },
      {
        key: "cancelled",
        label: "Order cancelled",
        description:
          "The unpaid reservation was cancelled and released back into stock.",
        state: "current",
      },
      {
        key: "processing",
        label: "Preparing items",
        description: "This order will not move into fulfillment.",
        state: "upcoming",
      },
      {
        key: "shipped",
        label: "Shipped",
        description: "This order will not be shipped.",
        state: "upcoming",
      },
      {
        key: "delivered",
        label: "Delivered",
        description: "This order was not completed.",
        state: "upcoming",
      },
    ];
  }

  if (isExpired) {
    return [
      {
        key: "placed",
        label: "Order placed",
        description: "We received your order successfully.",
        state: "done",
      },
      {
        key: "expired",
        label: "Payment window expired",
        description:
          "This reservation was not paid in time and is no longer active.",
        state: "current",
      },
      {
        key: "processing",
        label: "Preparing items",
        description: "The seller can only prepare the order after payment.",
        state: "upcoming",
      },
      {
        key: "shipped",
        label: "Shipped",
        description: "This order was not moved into shipment.",
        state: "upcoming",
      },
      {
        key: "delivered",
        label: "Delivered",
        description: "This order was never completed.",
        state: "upcoming",
      },
    ];
  }

  return [
    {
      key: "placed",
      label: "Order placed",
      description: "We received your order successfully.",
      state: "done",
    },
    {
      key: "paid",
      label: "Payment confirmed",
      description: isPaid
        ? `Completed on ${formatDateTime(order?.paidAt)}.`
        : "Waiting for payment confirmation.",
      state: isPaid ? "done" : "current",
    },
    {
      key: "processing",
      label: "Preparing items",
      description: "The seller is preparing the order for shipment.",
      state:
        orderStatus === "processing"
          ? "current"
          : ["shipped", "delivered"].includes(orderStatus)
            ? "done"
            : "upcoming",
    },
    {
      key: "shipped",
      label: "Shipped",
      description: "The order has been handed over for delivery.",
      state:
        orderStatus === "shipped"
          ? "current"
          : orderStatus === "delivered"
            ? "done"
            : "upcoming",
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "The order has reached its destination.",
      state: orderStatus === "delivered" ? "done" : "upcoming",
    },
  ];
};

const getJourneyHeadline = (order) => {
  const isExpired =
    order?.reservationStatus === "expired" || order?.orderStatus === "expired";
  const isCancelled = order?.orderStatus === "cancelled";

  if (isCancelled) {
    return {
      eyebrow: "Order cancelled",
      text: "This unpaid reservation was cancelled manually and is no longer active.",
    };
  }

  if (isExpired) {
    return {
      eyebrow: "Reservation expired",
      text: "This order was not paid in time. The reserved stock was released back into availability.",
    };
  }

  if (!order?.isPaid) {
    return {
      eyebrow: "Awaiting payment",
      text: "Complete the PayPal payment below before the reservation expires.",
    };
  }

  if (order.orderStatus === "processing") {
    return {
      eyebrow: "Current step",
      text: "Payment was confirmed and the seller is currently preparing your order.",
    };
  }

  if (order.orderStatus === "shipped") {
    return {
      eyebrow: "On the way",
      text: "This order has already shipped. The next visible update will be delivery confirmation.",
    };
  }

  if (order.orderStatus === "delivered") {
    return {
      eyebrow: "Delivered",
      text: "This order has been completed successfully.",
    };
  }

  return {
    eyebrow: "Order active",
    text: "This order is moving through the standard fulfillment process.",
  };
};

const OrderDetails = () => {
  const { id } = useParams();
  const { userInfo } = useSelector((state) => state.auth);

  const { data: order, isLoading, error, refetch } = useGetOrderByIdQuery(id);

  const [nowMs, setNowMs] = useState(Date.now());
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const [cancelOrder, { isLoading: cancellingOrder }] =
    useCancelOrderMutation();

  const isReservationExpired =
    order?.reservationStatus === "expired" || order?.orderStatus === "expired";

  const isOrderCancelled = order?.orderStatus === "cancelled";

  const isOrderOwner =
    Boolean(order?.user) &&
    Boolean(userInfo?._id) &&
    order.user === userInfo._id;

  const canPayForOrder =
    Boolean(order) &&
    isOrderOwner &&
    order.paymentMethod === "paypal" &&
    order.paymentStatus === "unpaid" &&
    !order.isPaid &&
    order.reservationStatus === "active" &&
    order.orderStatus === "placed" &&
    !isReservationExpired &&
    !isOrderCancelled;

  const canCancelOrder =
    Boolean(order) &&
    isOrderOwner &&
    order.paymentStatus === "unpaid" &&
    !order.isPaid &&
    order.reservationStatus === "active" &&
    order.orderStatus === "placed" &&
    !isReservationExpired &&
    !isOrderCancelled;

  const reservationExpiryMs = useMemo(() => {
    if (!order?.expiresAt) return 0;

    const parsed = new Date(order.expiresAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [order?.expiresAt]);

  const msUntilExpiry = useMemo(() => {
    if (!canPayForOrder || !reservationExpiryMs) return 0;
    return Math.max(0, reservationExpiryMs - nowMs);
  }, [canPayForOrder, reservationExpiryMs, nowMs]);

  const formattedCountdown = useMemo(() => {
    return formatCountdown(msUntilExpiry);
  }, [msUntilExpiry]);

  useEffect(() => {
    setNowMs(Date.now());
  }, [order?.expiresAt, canPayForOrder]);

  useEffect(() => {
    if (!canPayForOrder || !reservationExpiryMs) {
      return;
    }

    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      if (current >= reservationExpiryMs) {
        clearInterval(interval);
        refetch();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [canPayForOrder, reservationExpiryMs, refetch]);

  const {
    data: paypalConfig,
    isLoading: loadingPayPalConfig,
    error: paypalConfigError,
  } = useGetPayPalClientIdQuery(undefined, {
    skip: !canPayForOrder,
  });

  const [createPayPalOrder, { isLoading: creatingPayPalOrder }] =
    useCreatePayPalOrderMutation();

  const [capturePayPalOrder, { isLoading: capturingPayPalOrder }] =
    useCapturePayPalOrderMutation();

  const createPayPalOrderHandler = async () => {
    const response = await createPayPalOrder(id).unwrap();
    return response.paypalOrderId;
  };

  const approvePayPalOrderHandler = async (data) => {
    await capturePayPalOrder({
      orderId: id,
      paypalOrderId: data.orderID,
    }).unwrap();

    toast.success("Payment completed successfully");
    refetch();
  };

  const handlePayPalError = () => {
    toast.error("PayPal payment could not be completed");
  };

  const handleConfirmCancelOrder = async () => {
    if (!canCancelOrder) {
      return;
    }

    try {
      await cancelOrder(order._id).unwrap();
      setIsCancelDialogOpen(false);
      toast.success("Order cancelled successfully");
      refetch();
    } catch (cancelError) {
      toast.error(
        cancelError?.data?.message ||
          cancelError?.error ||
          "Failed to cancel order",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message || error?.error || "Order not found"}
        </Message>
      </div>
    );
  }

  const journeySteps = getOrderJourneySteps(order);
  const journeyHeadline = getJourneyHeadline(order);

  const itemFulfillmentCounts = order.orderItems.reduce(
    (acc, item) => {
      const status = item.fulfillmentStatus || "placed";
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

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Order ID
              </p>
              <h1 className="mt-1 break-all text-2xl font-semibold text-slate-900">
                {order._id}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Created{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canCancelOrder && (
                <button
                  type="button"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                >
                  Cancel order
                </button>
              )}

              <Link
                to="/my-orders"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back to my orders
              </Link>
            </div>
          </div>

          {order.isPaid ? (
            <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-semibold text-emerald-900">
                Payment received successfully
              </h2>

              <p className="mt-2 text-sm text-emerald-800">
                Your payment was completed on {formatDateTime(order.paidAt)}.
                This order is now being prepared for fulfillment.
              </p>
            </div>
          ) : isOrderCancelled ? (
            <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="text-lg font-semibold text-rose-900">
                Order cancelled
              </h2>

              <p className="mt-2 text-sm text-rose-800">
                This unpaid reservation was cancelled successfully and no longer
                blocks product availability.
              </p>
            </div>
          ) : isReservationExpired ? (
            <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Payment window expired
              </h2>

              <p className="mt-2 text-sm text-slate-700">
                This unpaid reservation expired before payment was completed. To
                purchase this product, place a new order from the product page.
              </p>
            </div>
          ) : (
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-amber-900">
                    Awaiting payment
                  </h2>

                  <p className="mt-2 text-sm text-amber-800">
                    Complete the PayPal payment before this reservation expires.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 sm:min-w-52">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                    Reservation expires in
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-amber-900">
                    {formattedCountdown}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Until {formatDateTime(order.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              {order.orderItems.map((item) => (
                <article
                  key={`${order._id}-${item.product}`}
                  className="rounded-3xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Link
                      to={`/products/${item.product}`}
                      className="block h-28 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:w-32"
                    >
                      {item.image ? (
                        <ProductImagePreview
                          src={item.image}
                          alt={item.name}
                          wrapperClassName="h-full w-full bg-slate-100"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Link to={`/products/${item.product}`}>
                            <h2 className="text-lg font-semibold text-slate-900 transition hover:text-slate-700">
                              {item.name}
                            </h2>
                          </Link>

                          <p className="mt-1 text-sm text-slate-500">
                            Quantity: {item.qty}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                fulfillmentStatusStyles[
                                  item.fulfillmentStatus
                                ] || fulfillmentStatusStyles.placed
                              }`}
                            >
                              {formatFulfillmentLabel(item.fulfillmentStatus)}
                            </span>

                            {item.shippedAt ? (
                              <span className="text-xs text-slate-500">
                                Shipped {formatDateTime(item.shippedAt)}
                              </span>
                            ) : null}

                            {item.deliveredAt ? (
                              <span className="text-xs text-slate-500">
                                Delivered {formatDateTime(item.deliveredAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-lg font-semibold text-slate-900">
                            {formatPrice(item.price)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatPrice(Number(item.price) * Number(item.qty))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Order journey
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Track the current fulfillment stage for this order.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:max-w-[320px]">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {journeyHeadline.eyebrow}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {journeyHeadline.text}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {journeySteps.map((step, index) => {
                    const isLast = index === journeySteps.length - 1;
                    const isDone = step.state === "done";
                    const isCurrent = step.state === "current";

                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                              isDone
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : isCurrent
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-slate-200 bg-slate-50 text-slate-400"
                            }`}
                          >
                            {index + 1}
                          </div>

                          {!isLast && (
                            <div className="mt-2 h-8 w-px bg-slate-200" />
                          )}
                        </div>

                        <div className="min-w-0 pb-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {step.label}
                            </h3>

                            {isCurrent && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                                Current
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </section>

            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Order summary
                </h2>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4 text-slate-600">
                    <span>Payment status</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        paymentStatusStyles[order.paymentStatus] ||
                        paymentStatusStyles.unpaid
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-slate-600">
                    <span>Order status</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        orderStatusStyles[order.orderStatus] ||
                        orderStatusStyles.placed
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4" />

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Item fulfillment
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {Object.entries(itemFulfillmentCounts)
                        .filter(([, count]) => Number(count) > 0)
                        .map(([status, count]) => (
                          <span
                            key={`summary-${status}`}
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                              fulfillmentStatusStyles[status] ||
                              fulfillmentStatusStyles.placed
                            }`}
                          >
                            {formatFulfillmentLabel(status)}: {count}
                          </span>
                        ))}
                    </div>
                  </div>

                  {!order.isPaid && !isOrderCancelled && (
                    <>
                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Reservation</span>
                        <span className="font-medium text-slate-900 capitalize">
                          {order.reservationStatus || "active"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Expires at</span>
                        <span className="font-medium text-right text-slate-900">
                          {formatDateTime(order.expiresAt)}
                        </span>
                      </div>

                      {canPayForOrder && (
                        <div className="flex items-center justify-between gap-4 text-slate-600">
                          <span>Time left</span>
                          <span className="font-semibold text-amber-700">
                            {formattedCountdown}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-slate-600">
                    <span>Items price</span>
                    <span className="font-medium text-slate-900">
                      {formatPrice(order.itemsPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-slate-900">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-lg font-semibold">
                      {formatPrice(order.totalPrice)}
                    </span>
                  </div>

                  {order.isPaid && (
                    <>
                      <div className="border-t border-slate-100 pt-4" />

                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Paid at</span>
                        <span className="font-medium text-right text-slate-900">
                          {formatDateTime(order.paidAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Method</span>
                        <span className="font-medium text-slate-900 capitalize">
                          {order.paymentMethod}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Payer email</span>
                        <span className="break-all font-medium text-right text-slate-900">
                          {order.paymentResult?.payerEmail || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Payment reference</span>
                        <span className="break-all font-medium text-right text-slate-900">
                          {order.paymentResult?.paypalCaptureId || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>PayPal status</span>
                        <span className="font-medium text-slate-900">
                          {order.paymentResult?.status || "—"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {canPayForOrder && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Complete payment
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Pay securely with PayPal before the reservation expires.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 px-3 py-2 text-right">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                        Time left
                      </p>
                      <p className="text-lg font-semibold text-amber-900">
                        {formattedCountdown}
                      </p>
                    </div>
                  </div>

                  {loadingPayPalConfig ? (
                    <div className="mt-4 flex justify-center py-4">
                      <Loader />
                    </div>
                  ) : paypalConfigError ? (
                    <div className="mt-4">
                      <Message variant="danger">
                        {paypalConfigError?.data?.message ||
                          paypalConfigError?.error ||
                          "Failed to load PayPal configuration"}
                      </Message>
                    </div>
                  ) : paypalConfig?.clientId ? (
                    <div className="mt-4">
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalConfig.clientId,
                          currency: "USD",
                          intent: "capture",
                        }}
                      >
                        <PayPalButtons
                          style={{
                            layout: "vertical",
                            shape: "rect",
                            label: "paypal",
                          }}
                          disabled={creatingPayPalOrder || capturingPayPalOrder}
                          createOrder={createPayPalOrderHandler}
                          onApprove={approvePayPalOrderHandler}
                          onError={handlePayPalError}
                        />
                      </PayPalScriptProvider>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Message variant="danger">
                        PayPal client ID is not available.
                      </Message>
                    </div>
                  )}
                </div>
              )}

              {isReservationExpired && !order.isPaid && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Reservation closed
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    This order can no longer be paid because the unpaid
                    reservation expired. To buy the product again, place a new
                    order from the product page.
                  </p>

                  <Link
                    to="/shop"
                    className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Return to shop
                  </Link>
                </div>
              )}

              {isOrderCancelled && !order.isPaid && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Reservation released
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    This order was cancelled before payment, so it can no longer
                    be completed. You can place a new order any time from the
                    product page.
                  </p>

                  <Link
                    to="/shop"
                    className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Return to shop
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isCancelDialogOpen}
        title="Cancel this order?"
        description="This will release the reserved stock immediately and the unpaid order will no longer be payable."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        onCancel={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancelOrder}
        loading={cancellingOrder}
        variant="danger"
      />
    </>
  );
};

export default OrderDetails;
