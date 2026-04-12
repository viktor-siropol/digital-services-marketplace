import { Link } from "react-router-dom";
import { FaRegHeart } from "react-icons/fa";
import ProductImagePreview from "./ProductImagePreview";

const favoriteIconStyle = {
  stroke: "rgba(0,0,0,0.95)",
  strokeWidth: 24,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.85))",
};

const ProductCard = ({
  product,
  actions = null,
  showFavoriteAffordance = false,
  variant = "default",
}) => {
  const isCompact = variant === "compact";

  const previewImage =
    product.images?.[0]?.medium ||
    product.images?.[0]?.original ||
    product.images?.[0]?.thumbnail;

  const previewBlur = product.images?.[0]?.blurDataURL;

  const overlayContent =
    actions ||
    (showFavoriteAffordance ? (
      <div className="pointer-events-none select-none">
        <FaRegHeart
          className="text-[28px] text-white"
          style={favoriteIconStyle}
        />
      </div>
    ) : null);

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-100">
        {overlayContent ? (
          <div className="absolute right-3 top-3 z-20">{overlayContent}</div>
        ) : null}

        <Link to={`/products/${product._id}`} className="block">
          {previewImage ? (
            <ProductImagePreview
              src={previewImage}
              blurDataURL={previewBlur}
              alt={product.name}
              wrapperClassName="aspect-[4/3] w-full bg-slate-100"
              className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-[1.015]"
            />
          ) : (
            <div className="flex aspect-4/3 w-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
        </Link>
      </div>

      <div className={isCompact ? "px-1 pb-1 pt-2.5" : "px-1 pb-1 pt-3"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/products/${product._id}`} className="block">
              <h3
                className={`line-clamp-2 font-medium text-slate-900 transition hover:text-slate-700 ${
                  isCompact ? "text-sm leading-5" : "text-[15px] leading-6"
                }`}
              >
                {product.name}
              </h3>
            </Link>

            <p
              className={`mt-1 font-medium uppercase tracking-wide text-slate-400 ${
                isCompact ? "text-[11px]" : "text-xs"
              }`}
            >
              {product.brand || "Product"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className={`font-semibold leading-none text-slate-900 ${
                isCompact ? "text-xl" : "text-[22px]"
              }`}
            >
              ${product.price}
            </p>

            <p
              className={`mt-2 font-medium ${
                isCompact ? "text-[11px]" : "text-xs"
              } ${
                product.countInStock > 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {product.countInStock > 0 ? "Available" : "Out of stock"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
