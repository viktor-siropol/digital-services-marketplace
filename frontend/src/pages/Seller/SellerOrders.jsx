import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRotateCcw, FiSearch, FiX } from "react-icons/fi";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import SelectMenu from "../../components/form/SelectMenu";
import { useGetMySalesOrdersQuery } from "../../redux/api/orderApiSlice";

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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

const paymentFilterOptions = [
  { value: "all", label: "All payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const orderStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "placed", label: "Placed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Total: high to low" },
  { value: "total-asc", label: "Total: low to high" },
];

const formatFulfillmentLabel = (value) => {
  if (value === "placed") return "Placed";
  if (value === "processing") return "Processing";
  if (value === "shipped") return "Shipped";
  if (value === "delivered") return "Delivered";
  return "Placed";
};

const SellerOrders = () => {
  const { data: orders = [], isLoading, error } = useGetMySalesOrdersQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const summary = useMemo(() => {
    return {
      total: orders.length,
      paid: orders.filter((order) => order.paymentStatus === "paid").length,
      unpaid: orders.filter((order) => order.paymentStatus === "unpaid").length,
      actionable: orders.filter(
        (order) => Number(order.actionableItemsCount || 0) > 0,
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let items = [...orders];

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();

      items = items.filter((order) => {
        const matchesOrderId = order._id?.toLowerCase().includes(query);

        const matchesProductName = order.orderItems?.some((item) =>
          item.name?.toLowerCase().includes(query),
        );

        return matchesOrderId || matchesProductName;
      });
    }

    if (paymentFilter !== "all") {
      items = items.filter((order) => order.paymentStatus === paymentFilter);
    }

    if (orderStatusFilter !== "all") {
      items = items.filter((order) => order.orderStatus === orderStatusFilter);
    }

    switch (sortBy) {
      case "oldest":
        items.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case "total-desc":
        items.sort(
          (a, b) => Number(b.totalPrice || 0) - Number(a.totalPrice || 0),
        );
        break;
      case "total-asc":
        items.sort(
          (a, b) => Number(a.totalPrice || 0) - Number(b.totalPrice || 0),
        );
        break;
      case "newest":
      default:
        items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }

    return items;
  }, [orders, searchTerm, paymentFilter, orderStatusFilter, sortBy]);

  const activeFilterPills = useMemo(() => {
    const pills = [];

    if (searchTerm.trim()) {
      pills.push({
        key: "search",
        label: `Search: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm(""),
      });
    }

    if (paymentFilter !== "all") {
      const paymentLabel =
        paymentFilterOptions.find((option) => option.value === paymentFilter)
          ?.label || "Payment";

      pills.push({
        key: "payment",
        label: paymentLabel,
        onRemove: () => setPaymentFilter("all"),
      });
    }

    if (orderStatusFilter !== "all") {
      const orderLabel =
        orderStatusOptions.find((option) => option.value === orderStatusFilter)
          ?.label || "Status";

      pills.push({
        key: "orderStatus",
        label: orderLabel,
        onRemove: () => setOrderStatusFilter("all"),
      });
    }

    return pills;
  }, [searchTerm, paymentFilter, orderStatusFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setPaymentFilter("all");
    setOrderStatusFilter("all");
    setSortBy("newest");
  };

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
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
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
            Review orders that include your products and manage item-level
            fulfillment.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total sales
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Paid
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.paid}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Unpaid
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.unpaid}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Need action
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.actionable}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
                <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by order ID or product name"
                  className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Payment
              </label>

              <SelectMenu
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={paymentFilterOptions}
                placeholder="All payments"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Order status
              </label>

              <SelectMenu
                value={orderStatusFilter}
                onChange={setOrderStatusFilter}
                options={orderStatusOptions}
                placeholder="All statuses"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Sort
              </label>

              <SelectMenu
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
                placeholder="Newest first"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <FiRotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {activeFilterPills.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {activeFilterPills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={pill.onRemove}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  <span>{pill.label}</span>
                  <FiX className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {filteredOrders.length} result
            {filteredOrders.length === 1 ? "" : "s"}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No sales orders match your filters
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search term or reset the current filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const itemCount = order.orderItems.reduce(
                (sum, item) => sum + Number(item.qty || 0),
                0,
              );

              const firstItem = order.orderItems[0];
              const previewImage = firstItem?.image || "";
              const extraItemsCount = Math.max(0, order.orderItems.length - 1);

              return (
                <article
                  key={order._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <Link
                        to={order._id.toString()}
                        className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      >
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
                      </Link>

                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Order ID
                        </p>

                        <Link to={order._id.toString()}>
                          <h2 className="mt-1 break-all text-base font-semibold text-slate-900 transition hover:text-slate-700">
                            {order._id}
                          </h2>
                        </Link>

                        <p className="mt-3 text-sm text-slate-500">
                          Created {formatDate(order.createdAt)}
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
                            Order: {order.orderStatus}
                          </span>

                          <span className="text-xs text-slate-500">
                            Items sold: {itemCount}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {Object.entries(order.sellerItemCounts || {})
                            .filter(([, count]) => Number(count) > 0)
                            .map(([status, count]) => (
                              <span
                                key={`${order._id}-${status}`}
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                  fulfillmentStatusStyles[status] ||
                                  fulfillmentStatusStyles.placed
                                }`}
                              >
                                {formatFulfillmentLabel(status)}: {count}
                              </span>
                            ))}
                        </div>

                        {order.lifecycleBlockedReason ? (
                          <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">
                            {order.lifecycleBlockedReason}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                      <div className="text-left lg:text-right">
                        <p className="text-2xl font-semibold text-slate-900">
                          {formatPrice(order.totalPrice)}
                        </p>
                        <Link
                          to={order._id.toString()}
                          className="mt-1 block text-sm text-slate-500 transition hover:text-slate-700"
                        >
                          {firstItem?.name || "Sold items"}
                          {extraItemsCount > 0
                            ? ` +${extraItemsCount} more`
                            : ""}
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {order.actionableItemsCount > 0 ? (
                          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                            {order.actionableItemsCount} item
                            {order.actionableItemsCount === 1 ? "" : "s"} need
                            an update
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                            No pending item actions
                          </div>
                        )}

                        <Link
                          to={order._id.toString()}
                          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOrders;
