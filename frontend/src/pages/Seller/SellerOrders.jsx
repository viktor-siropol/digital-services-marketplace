import { Link } from "react-router-dom";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import { useGetMySalesOrdersQuery } from "../../redux/api/orderApiSlice";

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

const SellerOrders = () => {
  const { data: orders = [], isLoading, error } = useGetMySalesOrdersQuery();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message ||
            error?.error ||
            "Failed to load sales orders"}
        </Message>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">
              No sales orders yet
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Orders placed for your products will appear here.
            </p>

            <Link
              to="/seller/products"
              className="mt-6 inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View my products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">
            Sales Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review orders that include your products and track fulfillment
            status.
          </p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => {
            const itemCount = order.orderItems.reduce(
              (sum, item) => sum + Number(item.qty || 0),
              0,
            );

            const firstItem = order.orderItems[0];
            const previewImage = firstItem?.image || "";

            return (
              <article
                key={order._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {previewImage ? (
                        <ProductImagePreview
                          src={previewImage}
                          alt={firstItem?.name || "Sold item"}
                          wrapperClassName="h-24 w-24 bg-slate-100"
                          className="h-24 w-24 object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Order ID
                      </p>

                      <h2 className="mt-1 break-all text-base font-semibold text-slate-900">
                        {order._id}
                      </h2>

                      <p className="mt-3 text-sm text-slate-500">
                        Created{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            paymentStatusStyles[order.paymentStatus] ||
                            paymentStatusStyles.unpaid
                          }`}
                        >
                          Payment: {order.paymentStatus}
                        </span>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            orderStatusStyles[order.orderStatus] ||
                            orderStatusStyles.placed
                          }`}
                        >
                          Status: {order.orderStatus}
                        </span>

                        <span className="text-xs text-slate-500">
                          Items sold: {itemCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                    <div className="text-left lg:text-right">
                      <p className="text-2xl font-semibold text-slate-900">
                        {formatPrice(order.totalPrice)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {firstItem?.name || "Sold items"}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SellerOrders;
