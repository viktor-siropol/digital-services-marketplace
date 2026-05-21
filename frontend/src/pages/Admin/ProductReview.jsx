import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import {
  useApproveProductMutation,
  useGetProductsPendingReviewQuery,
  useRejectProductMutation,
} from "../../redux/api/productApiSlice";

const ProductReview = () => {
  const {
    data: products = [],
    isLoading,
    error,
  } = useGetProductsPendingReviewQuery();

  const [approveProduct, { isLoading: isApproving }] =
    useApproveProductMutation();

  const [rejectProduct, { isLoading: isRejecting }] =
    useRejectProductMutation();

  const handleApprove = async (id) => {
    try {
      await approveProduct(id).unwrap();
      toast.success("Product approved");
    } catch (err) {
      toast.error(err?.data?.message || err.error || "Approval failed");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejection:");

    if (reason === null) return;

    try {
      await rejectProduct({
        id,
        reason: reason.trim() || "Rejected by admin",
      }).unwrap();

      toast.success("Product rejected");
    } catch (err) {
      toast.error(err?.data?.message || err.error || "Rejection failed");
    }
  };

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message || error.error || "Failed to load products"}
        </Message>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            Admin moderation
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Products pending review
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review seller submissions before they become public in the
            marketplace.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {products.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                No products pending review
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                New seller submissions will appear here.
              </p>
            </div>
          ) : (
            products.map((product) => {
              const image =
                product.images?.[0]?.thumbnail ||
                product.images?.[0]?.medium ||
                product.images?.[0]?.original;

              return (
                <article
                  key={product._id}
                  className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="h-28 w-full overflow-hidden rounded-3xl bg-slate-100 md:w-40">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Pending review
                        </span>

                        <span className="text-xs text-slate-400">
                          ${Number(product.price || 0).toFixed(2)}
                        </span>
                      </div>

                      <h2 className="mt-2 text-lg font-semibold text-slate-900">
                        {product.name}
                      </h2>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                        {product.description}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Brand: {product.brand || "Unknown"} · Stock:{" "}
                        {product.countInStock}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        to={`/products/${product._id}`}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Preview
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleApprove(product._id)}
                        disabled={isApproving || isRejecting}
                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(product._id)}
                        disabled={isApproving || isRejecting}
                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReview;
