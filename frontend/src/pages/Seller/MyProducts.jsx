import { useEffect, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import {
  useDeleteProductMutation,
  useGetMyProductsQuery,
  useRetryProductImageProcessingMutation,
} from "../../redux/api/productApiSlice";

const statusStyles = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const MyProducts = () => {
  const {
    data: products = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetMyProductsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [retryProcessing, { isLoading: retrying }] =
    useRetryProductImageProcessingMutation();

  const hasProcessingProducts = products.some(
    (product) => product.status === "processing",
  );

  useEffect(() => {
    if (!hasProcessingProducts) return;

    const interval = setInterval(() => {
      refetch();
    }, 2500);

    return () => clearInterval(interval);
  }, [hasProcessingProducts, refetch]);

  const openDeleteDialog = (product) => {
    setProductToDelete(product);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setProductToDelete(null);
  };

  const confirmDeleteHandler = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct(productToDelete._id).unwrap();
      toast.success("Product deleted successfully.");
      setProductToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete product");
    }
  };

  const retryHandler = async (id) => {
    try {
      await retryProcessing(id).unwrap();
      toast.success("Image processing restarted.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to restart processing");
    }
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
          {error?.data?.message || error?.error || "Failed to load products"}
        </Message>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-20 top-12 h-56 w-56 rounded-full bg-violet-200/30" />
        <div className="absolute -right-24 top-28 h-52 w-52 rounded-full bg-slate-200/40" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-100/30" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-medium text-violet-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Seller workspace
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              My Products
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage your listings, monitor status and keep your catalog up to
              date.
            </p>
          </div>

          <Link
            to="/seller/products/new"
            className="inline-flex items-center rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(99,102,241,0.28)] transition hover:from-violet-700 hover:to-indigo-700"
          >
            Create product
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {products.length} product{products.length === 1 ? "" : "s"}
          </div>

          {hasProcessingProducts && (
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {isFetching ? "Refreshing..." : "Processing in progress"}
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-center shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              No products yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Start by creating your first listing.
            </p>
            <Link
              to="/seller/products/new"
              className="mt-5 inline-flex items-center rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(99,102,241,0.28)] transition hover:from-violet-700 hover:to-indigo-700"
            >
              Create product
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const previewImage =
                product.images?.[0]?.thumbnail ||
                product.images?.[0]?.medium ||
                product.images?.[0]?.original;

              const previewBlur = product.images?.[0]?.blurDataURL;

              return (
                <div
                  key={product._id}
                  className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {previewImage ? (
                          <ProductImagePreview
                            src={previewImage}
                            blurDataURL={previewBlur}
                            alt={product.name}
                            wrapperClassName="h-20 w-20"
                            className="h-20 w-20 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center bg-slate-100 text-xs text-slate-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Created{" "}
                          {new Date(product.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                              statusStyles[product.status] ||
                              statusStyles.processing
                            }`}
                          >
                            {product.status}
                          </span>

                          <span className="text-xs text-slate-500">
                            Quantity: {product.quantity}
                          </span>
                          <span className="text-xs text-slate-500">
                            Stock: {product.countInStock}
                          </span>

                          <span className="text-xs text-slate-500">
                            Price: {product.price}
                          </span>
                        </div>

                        {product.status === "failed" &&
                          product.processingError && (
                            <p className="mt-2 text-xs text-rose-600">
                              {product.processingError}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Link
                        to={`/seller/products/${product._id}`}
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Manage
                      </Link>

                      {product.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => retryHandler(product._id)}
                          disabled={retrying}
                          className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Retry
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openDeleteDialog(product)}
                        disabled={deleting}
                        className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="Delete product?"
        description={
          productToDelete
            ? `This will permanently delete "${productToDelete.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteHandler}
        onCancel={closeDeleteDialog}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
};

export default MyProducts;
