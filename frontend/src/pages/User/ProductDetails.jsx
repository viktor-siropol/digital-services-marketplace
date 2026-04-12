import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductCard from "../../components/ProductCard";
import ProductImagePreview from "../../components/ProductImagePreview";
import {
  useGetPublicProductByIdQuery,
  useGetPublicProductsQuery,
} from "../../redux/api/productApiSlice";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const overlayIconStyle = {
  stroke: "rgba(0,0,0,0.95)",
  strokeWidth: 18,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.85))",
};

const getCategoryId = (item) => {
  if (!item?.category) return "";

  return typeof item.category === "object"
    ? item.category?._id || ""
    : item.category;
};

const normalizeBrand = (value = "") => value.trim().toLowerCase();

const getPriceSimilarityScore = (currentPrice, candidatePrice) => {
  if (!currentPrice || !candidatePrice) return 0;

  const largerPrice = Math.max(currentPrice, candidatePrice, 1);
  const diffRatio = Math.abs(candidatePrice - currentPrice) / largerPrice;

  if (diffRatio <= 0.1) return 18;
  if (diffRatio <= 0.2) return 14;
  if (diffRatio <= 0.35) return 10;
  if (diffRatio <= 0.5) return 6;

  return 0;
};

const getFreshnessScore = (createdAt) => {
  if (!createdAt) return 0;

  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) return 0;

  const daysSinceCreated = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated <= 14) return 6;
  if (daysSinceCreated <= 30) return 4;
  if (daysSinceCreated <= 90) return 2;

  return 0;
};

const getRatingScore = (candidate) => {
  const rating = Number(candidate?.rating || 0);
  const numReviews = Number(candidate?.numReviews || 0);

  if (rating <= 0 || numReviews <= 0) return 0;

  return Math.min(8, rating * 1.2 + Math.min(numReviews, 5) * 0.4);
};

const getSuggestedProducts = ({ currentProduct, products, limit = 6 }) => {
  if (!currentProduct || !products.length) return [];

  const currentProductId = currentProduct._id;
  const currentCategoryId = getCategoryId(currentProduct);
  const currentBrand = normalizeBrand(currentProduct.brand);
  const currentPrice = Number(currentProduct.price || 0);

  const baseCandidates = products.filter(
    (candidate) => candidate?._id && candidate._id !== currentProductId,
  );

  if (!baseCandidates.length) return [];

  const availableCandidates = baseCandidates.filter(
    (candidate) => Number(candidate.countInStock) > 0,
  );

  const rankingPool =
    availableCandidates.length >= Math.min(4, limit)
      ? availableCandidates
      : baseCandidates;

  const scoredCandidates = rankingPool
    .map((candidate) => {
      let score = 0;

      const candidateCategoryId = getCategoryId(candidate);
      const candidateBrand = normalizeBrand(candidate.brand);

      if (candidateCategoryId && candidateCategoryId === currentCategoryId) {
        score += 60;
      }

      if (candidateBrand && candidateBrand === currentBrand) {
        score += 18;
      }

      score += getPriceSimilarityScore(
        currentPrice,
        Number(candidate.price || 0),
      );

      if (Number(candidate.countInStock) > 0) {
        score += 10;
      } else {
        score -= 12;
      }

      if (candidate.images?.length) {
        score += 3;
      }

      score += getFreshnessScore(candidate.createdAt);
      score += getRatingScore(candidate);

      return {
        product: candidate,
        score,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        new Date(b.product.createdAt).getTime() -
        new Date(a.product.createdAt).getTime()
      );
    });

  const selected = [];
  const deferred = [];
  const brandCounts = new Map();

  for (const entry of scoredCandidates) {
    const brandKey = normalizeBrand(entry.product.brand);

    if (brandKey && (brandCounts.get(brandKey) || 0) >= 2) {
      deferred.push(entry);
      continue;
    }

    selected.push(entry.product);

    if (brandKey) {
      brandCounts.set(brandKey, (brandCounts.get(brandKey) || 0) + 1);
    }

    if (selected.length === limit) {
      return selected;
    }
  }

  for (const entry of deferred) {
    if (selected.some((item) => item._id === entry.product._id)) {
      continue;
    }

    selected.push(entry.product);

    if (selected.length === limit) {
      break;
    }
  }

  return selected;
};

const ProductDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const { data: product, isLoading, error } = useGetPublicProductByIdQuery(id);

  const { data: publicProducts = [] } = useGetPublicProductsQuery();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeSection, setActiveSection] = useState("description");
  const [previewImage, setPreviewImage] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  useEffect(() => {
    setSelectedImageIndex(0);
    setActiveSection("description");
    setPreviewImage(null);
    setPurchaseQuantity(1);
  }, [product?._id]);

  const selectedImage = product?.images?.[selectedImageIndex] || null;

  const cartPreviewImage =
    selectedImage?.thumbnail ||
    selectedImage?.medium ||
    selectedImage?.original ||
    product?.images?.[0]?.thumbnail ||
    product?.images?.[0]?.medium ||
    product?.images?.[0]?.original ||
    "";

  const createdDate = useMemo(() => {
    if (!product?.createdAt) return "—";

    return new Date(product.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [product?.createdAt]);

  const productInfoRows = useMemo(() => {
    if (!product) return [];

    return [
      {
        label: "Brand",
        value: product.brand || "—",
      },
      {
        label: "Price",
        value: `$${product.price}`,
      },
      {
        label: "Available stock",
        value: product.countInStock,
      },
      {
        label: "Created",
        value: createdDate,
      },
    ];
  }, [product, createdDate]);

  const suggestedProducts = useMemo(() => {
    return getSuggestedProducts({
      currentProduct: product,
      products: publicProducts,
      limit: 6,
    });
  }, [product, publicProducts]);

  const maxPurchaseQuantity = Math.max(0, Number(product?.countInStock || 0));

  const totalPrice = useMemo(() => {
    if (!product) return "$0";
    return `$${(Number(product.price) * Number(purchaseQuantity || 0)).toFixed(
      2,
    )}`;
  }, [product, purchaseQuantity]);

  const openImagePreview = (image) => {
    if (!image) return;

    setPreviewImage({
      src: image.original || image.medium || image.thumbnail,
      name: image.alt || product?.name || "Preview image",
    });
  };

  const handleThumbnailClick = (image, index) => {
    if (index === selectedImageIndex) {
      openImagePreview(image);
      return;
    }

    setSelectedImageIndex(index);
  };

  const decreaseQuantity = () => {
    setPurchaseQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setPurchaseQuantity((prev) => Math.min(maxPurchaseQuantity, prev + 1));
  };

  const handleQuantityInputChange = (e) => {
    const value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setPurchaseQuantity(1);
      return;
    }

    if (value < 1) {
      setPurchaseQuantity(1);
      return;
    }

    if (value > maxPurchaseQuantity) {
      setPurchaseQuantity(maxPurchaseQuantity);
      return;
    }

    setPurchaseQuantity(value);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message || error?.error || "Product not found"}
        </Message>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <section className="overflow-hidden max-w-full rounded-3xl border border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={() => openImagePreview(selectedImage)}
                className="block w-full max-w-full overflow-hidden rounded-3xl border border-slate-100 bg-slate-100 text-left"
              >
                {selectedImage ? (
                  <ProductImagePreview
                    src={
                      selectedImage.original ||
                      selectedImage.medium ||
                      selectedImage.thumbnail
                    }
                    blurDataURL={selectedImage.blurDataURL}
                    alt={selectedImage.alt || product.name}
                    wrapperClassName="aspect-4/3 w-full bg-slate-100"
                    className="aspect-4/3 w-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="flex aspect-4/3 w-full items-center justify-center text-sm text-slate-400">
                    No image
                  </div>
                )}
              </button>

              {product.images?.length > 1 && (
                <div className="mt-4 grid w-full grid-cols-4 gap-3 md:grid-cols-5">
                  {product.images.map((image, index) => (
                    <button
                      key={image.imageId}
                      type="button"
                      onClick={() => handleThumbnailClick(image, index)}
                      className={`overflow-hidden rounded-2xl border transition ${
                        index === selectedImageIndex
                          ? "border-violet-400 ring-2 ring-violet-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <ProductImagePreview
                        src={image.thumbnail || image.medium || image.original}
                        blurDataURL={image.blurDataURL}
                        alt={image.alt || product.name}
                        wrapperClassName="aspect-square w-full bg-slate-100"
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="flex flex-wrap border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveSection("description")}
                  className={`px-5 py-4 text-sm font-medium transition ${
                    activeSection === "description"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Description
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection("comments")}
                  className={`px-5 py-4 text-sm font-medium transition ${
                    activeSection === "comments"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Comments
                </button>
              </div>

              <div className="p-6">
                {activeSection === "description" ? (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Description
                    </h2>

                    <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {product.description}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Comments
                    </h2>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">
                        Comments and ratings will be added here in the next
                        step.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {suggestedProducts.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Suggested products
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Similar items selected by category, brand, price range and
                    availability.
                  </p>
                </div>

                <div className="mt-5 -mx-5 overflow-x-auto px-5 pb-3">
                  <div className="flex gap-4">
                    {suggestedProducts.map((suggestedProduct) => (
                      <div
                        key={suggestedProduct._id}
                        className="w-55 shrink-0 sm:w-59"
                      >
                        <ProductCard
                          product={suggestedProduct}
                          showFavoriteAffordance
                          variant="compact"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900">
                {product.name}
              </h1>

              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-3xl font-semibold text-slate-900">
                  ${product.price}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    product.countInStock > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {product.countInStock > 0 ? "Available" : "Out of stock"}
                </span>
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <span>Available stock</span>
                  <span className="font-medium text-slate-900">
                    {product.countInStock}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Added</span>
                  <span className="font-medium text-slate-900">
                    {createdDate}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-slate-700">
                  Quantity
                </label>

                <div className="mt-2 flex items-center gap-3">
                  <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={
                        maxPurchaseQuantity === 0 || purchaseQuantity <= 1
                      }
                      className="flex h-11 w-11 items-center justify-center text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={maxPurchaseQuantity || 1}
                      value={purchaseQuantity}
                      onChange={handleQuantityInputChange}
                      disabled={maxPurchaseQuantity === 0}
                      className="h-11 w-16 border-x border-slate-200 bg-white text-center text-sm font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={
                        maxPurchaseQuantity === 0 ||
                        purchaseQuantity >= maxPurchaseQuantity
                      }
                      className="flex h-11 w-11 items-center justify-center text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-sm text-slate-500">
                    Total:{" "}
                    <span className="font-semibold text-slate-900">
                      {totalPrice}
                    </span>
                  </p>
                </div>
              </div>

              <Link
                to="/cart"
                className="mt-3 inline-flex text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                View cart
              </Link>
            </div>

            <div className="mt-5 self-start rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Product information
              </h2>

              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {productInfoRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-medium text-slate-900">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 p-1 transition hover:scale-105"
              aria-label="Close preview"
            >
              <IoClose
                className="text-[42px] text-white"
                style={overlayIconStyle}
              />
            </button>

            <img
              src={previewImage.src}
              alt={previewImage.name}
              className="h-full w-full object-fill"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
