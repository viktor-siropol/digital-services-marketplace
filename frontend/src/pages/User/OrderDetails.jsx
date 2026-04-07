import { useParams, Link } from "react-router-dom";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import { useGetOrderByIdQuery } from "../../redux/api/orderApiSlice";

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

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

const OrderDetails = () => {
  const { id } = useParams();

  const { data: order, isLoading, error } = useGetOrderByIdQuery(id);

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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
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
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
