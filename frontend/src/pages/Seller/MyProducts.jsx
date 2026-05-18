import { useEffect, useMemo, useState } from "react";
import { FiRotateCcw, FiSearch, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmDialog from "../../components/ConfirmDialog";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import SelectMenu from "../../components/form/SelectMenu";
import {
  useDeleteProductMutation,
  useGetMyProductsQuery,
  useRetryProductImageProcessingMutation,
} from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

const statusStyles = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "stock-desc", label: "Stock: high to low" },
  { value: "stock-asc", label: "Stock: low to high" },
  { value: "name-asc", label: "Name: A to Z" },
];

const stockOptions = [
  { value: "all", label: "All stock states" },
  { value: "in-stock", label: "In stock" },
  { value: "out-of-stock", label: "Out of stock" },
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const getCategoryId = (product) => {
  if (!product?.category) return "";

  return typeof product.category === "object"
    ? product.category?._id || ""
    : product.category;
};

const getCategoryName = (product, categoryNameById) => {
  if (!product?.category) return "";

  if (typeof product.category === "object") {
    return product.category?.name || "";
  }

  return categoryNameById.get(product.category) || "";
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

  const { data: categories = [], isLoading: loadingCategories } =
    useGetCategoriesQuery();

  const [productToDelete, setProductToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [retryProcessing, { isLoading: retrying }] =
    useRetryProductImageProcessingMutation();

  const hasProcessingProducts = products.some(
    (product) => product.status === "processing",
  );

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((item) => [item._id, item.name]));
  }, [categories]);

  const categoryOptions = useMemo(() => {
    return categories.map((item) => ({
      label: item.name,
      value: item._id,
    }));
  }, [categories]);

  const summary = useMemo(() => {
    return {
      total: products.length,
      ready: products.filter((product) => product.status === "ready").length,
      processing: products.filter((product) => product.status === "processing")
        .length,
      failed: products.filter((product) => product.status === "failed").length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let items = [...products];

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();

      items = items.filter((product) => {
        const categoryName = getCategoryName(product, categoryNameById);

        return (
          product.name?.toLowerCase().includes(query) ||
          product.brand?.toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      items = items.filter((product) => product.status === statusFilter);
    }

    if (categoryFilter) {
      items = items.filter(
        (product) => getCategoryId(product) === categoryFilter,
      );
    }

    if (stockFilter === "in-stock") {
      items = items.filter((product) => Number(product.countInStock || 0) > 0);
    }

    if (stockFilter === "out-of-stock") {
      items = items.filter((product) => Number(product.countInStock || 0) <= 0);
    }

    switch (sortBy) {
      case "oldest":
        items.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;

      case "price-desc":
        items.sort((a, b) => Number(b.price) - Number(a.price));
        break;

      case "price-asc":
        items.sort((a, b) => Number(a.price) - Number(b.price));
        break;

      case "stock-desc":
        items.sort(
          (a, b) => Number(b.countInStock || 0) - Number(a.countInStock || 0),
        );
        break;

      case "stock-asc":
        items.sort(
          (a, b) => Number(a.countInStock || 0) - Number(b.countInStock || 0),
        );
        break;

      case "name-asc":
        items.sort((a, b) => a.name.localeCompare(b.name));
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
  }, [
    products,
    searchTerm,
    statusFilter,
    categoryFilter,
    stockFilter,
    sortBy,
    categoryNameById,
  ]);

  const activeFilterPills = useMemo(() => {
    const pills = [];

    if (searchTerm.trim()) {
      pills.push({
        key: "search",
        label: `Search: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm(""),
      });
    }

    if (statusFilter !== "all") {
      pills.push({
        key: "status",
        label: `Status: ${statusFilter}`,
        onRemove: () => setStatusFilter("all"),
      });
    }

    if (categoryFilter) {
      const categoryLabel =
        categoryOptions.find((option) => option.value === categoryFilter)
          ?.label || "Category";

      pills.push({
        key: "category",
        label: categoryLabel,
        onRemove: () => setCategoryFilter(""),
      });
    }

    if (stockFilter !== "all") {
      const stockLabel =
        stockOptions.find((option) => option.value === stockFilter)?.label ||
        "Stock";

      pills.push({
        key: "stock",
        label: stockLabel,
        onRemove: () => setStockFilter("all"),
      });
    }

    return pills;
  }, [searchTerm, statusFilter, categoryFilter, stockFilter, categoryOptions]);

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
    } catch (deleteError) {
      toast.error(deleteError?.data?.message || "Failed to delete product");
    }
  };

  const retryHandler = async (id) => {
    try {
      await retryProcessing(id).unwrap();
      toast.success("Image processing restarted.");
      refetch();
    } catch (retryError) {
      toast.error(retryError?.data?.message || "Failed to restart processing");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("");
    setStockFilter("all");
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
          {error?.data?.message || error?.error || "Failed to load products"}
        </Message>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              Seller workspace
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              My Products
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage your listings, review status, and keep your product catalog
              up to date.
            </p>
          </div>

          <Link
            to="/seller/products/new"
            className="inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Create product
          </Link>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total products
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Ready
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.ready}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Processing
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.processing}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Failed
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.failed}
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
                  placeholder="Search by name, brand or category"
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
                Category
              </label>

              <SelectMenu
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                placeholder={
                  loadingCategories ? "Loading categories..." : "All categories"
                }
                disabled={loadingCategories}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Stock
              </label>

              <SelectMenu
                value={stockFilter}
                onChange={setStockFilter}
                options={stockOptions}
                placeholder="All stock states"
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "All statuses" },
              { value: "ready", label: "Ready" },
              { value: "processing", label: "Processing" },
              { value: "failed", label: "Failed" },
            ].map((option) => {
              const isActive = statusFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
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
            {filteredProducts.length} result
            {filteredProducts.length === 1 ? "" : "s"}
          </div>

          {hasProcessingProducts && (
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {isFetching ? "Refreshing..." : "Processing in progress"}
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No products yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Start by creating your first listing.
            </p>
            <Link
              to="/seller/products/new"
              className="mt-5 inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create product
            </Link>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No products match your filters
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
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const previewImage =
                product.images?.[0]?.thumbnail ||
                product.images?.[0]?.medium ||
                product.images?.[0]?.original;

              const previewBlur = product.images?.[0]?.blurDataURL;
              const categoryName = getCategoryName(product, categoryNameById);

              return (
                <article
                  key={product._id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-stretch">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
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
                        <h2 className="truncate text-xl font-semibold text-slate-900">
                          {product.name}
                        </h2>

                        <div className="flex mr-4">
                          <p className="mt-1 text-sm text-slate-500 mr-3.5">
                            Created {formatDate(product.createdAt)}
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                statusStyles[product.status] ||
                                statusStyles.processing
                              }`}
                            >
                              {product.status}
                            </span>
                          </div>
                        </div>

                        {(product.brand || categoryName) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                            {product.brand ? (
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center shadow-sm">
                                <span className="font-medium text-slate-600">
                                  Brand:
                                </span>{" "}
                                {product.brand}
                              </span>
                            ) : null}

                            {categoryName ? (
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center shadow-sm">
                                <span className="font-medium text-slate-600">
                                  Category:
                                </span>{" "}
                                {categoryName}
                              </span>
                            ) : null}
                          </div>
                        )}

                        {product.status === "failed" &&
                          product.processingError && (
                            <p className="mt-3 max-w-xl text-xs leading-6 text-rose-600">
                              {product.processingError}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex h-full flex-col justify-between xl:items-end">
                      <div className="grid grid-cols-[64px_64px_minmax(0,1fr)] gap-1.5">
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center shadow-sm">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Qty
                          </p>
                          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900">
                            {product.quantity}
                          </p>
                        </div>

                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center shadow-sm">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Stock
                          </p>
                          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900">
                            {product.countInStock}
                          </p>
                        </div>

                        <div className="min-w-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-center shadow-sm">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Price
                          </p>
                          <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-slate-900">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap justify-start gap-2 xl:justify-end">
                        <Link
                          to={`/seller/products/${product._id}`}
                          className="inline-flex min-w-24 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Manage
                        </Link>

                        {product.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => retryHandler(product._id)}
                            disabled={retrying}
                            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Retry
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openDeleteDialog(product)}
                          disabled={deleting}
                          className="inline-flex min-w-24 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
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
