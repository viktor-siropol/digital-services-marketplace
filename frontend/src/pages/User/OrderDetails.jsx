import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import {
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
};

const getOrderJourneySteps = (order) => {
  const orderStatus = order?.orderStatus || "placed";
  const isPaid = Boolean(order?.isPaid);

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
  if (!order?.isPaid) {
    return {
      eyebrow: "Awaiting payment",
      text: "Complete the PayPal payment below to move this order into fulfillment.",
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

  if (order.orderStatus === "cancelled") {
    return {
      eyebrow: "Cancelled",
      text: "This order is no longer moving through the fulfillment flow.",
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

  const isOrderOwner =
    Boolean(order?.user) &&
    Boolean(userInfo?._id) &&
    order.user === userInfo._id;

  const shouldShowPayPal =
    Boolean(order) &&
    isOrderOwner &&
    order.paymentStatus === "unpaid" &&
    !order.isPaid;

  const {
    data: paypalConfig,
    isLoading: loadingPayPalConfig,
    error: paypalConfigError,
  } = useGetPayPalClientIdQuery(undefined, {
    skip: !shouldShowPayPal,
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

  return (
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

          <Link
            to="/my-orders"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to my orders
          </Link>
        </div>

        {order.isPaid ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-semibold text-emerald-900">
              Payment received successfully
            </h2>

            <p className="mt-2 text-sm text-emerald-800">
              Your payment was completed on {formatDateTime(order.paidAt)}. This
              order is now being prepared for fulfillment.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-semibold text-amber-900">
              Awaiting payment
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              Complete the PayPal payment below to start order processing.
            </p>
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

            {shouldShowPayPal && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Complete payment
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Pay securely with PayPal to mark this order as paid.
                </p>

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
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
