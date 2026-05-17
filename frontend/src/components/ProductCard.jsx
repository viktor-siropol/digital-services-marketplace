import { Link } from "react-router-dom";
import ProductImagePreview from "./ProductImagePreview";
import FavoriteButton from "./Button/FavoriteButton";

const ProductCard = ({
  product,
  actions = null,
  variant = "default",
  showFavoriteAffordance = !actions,
}) => {
  const previewImage =
    product.images?.[0]?.medium ||
    product.images?.[0]?.original ||
    product.images?.[0]?.thumbnail;

  const previewBlur = product.images?.[0]?.blurDataURL;

  const isCompact = variant === "compact";

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-100">
        {(showFavoriteAffordance || actions) && (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            {showFavoriteAffordance ? (
              <FavoriteButton productId={product._id} />
            ) : null}

            {actions ? <div>{actions}</div> : null}
          </div>
        )}

        <Link to={`/products/${product._id}`} className="block">
          {previewImage ? (
            <ProductImagePreview
              src={previewImage}
              blurDataURL={previewBlur}
              alt={product.name}
              wrapperClassName={`w-full bg-slate-100 ${
                isCompact ? "aspect-[4/3]" : "aspect-[4/3]"
              }`}
              className={`w-full object-cover transition duration-300 group-hover:scale-[1.015] ${
                isCompact ? "aspect-[4/3]" : "aspect-[4/3]"
              }`}
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
        </Link>
      </div>

      <div className={`${isCompact ? "px-1 pb-1 pt-3" : "px-1 pb-1 pt-3"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/products/${product._id}`} className="block">
              <h3
                className={`line-clamp-2 font-medium text-slate-900 transition hover:text-slate-700 ${
                  isCompact ? "text-[15px] leading-6" : "text-[15px] leading-6"
                }`}
              >
                {product.name}
              </h3>
            </Link>

            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {product.brand || "Product"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[22px] font-semibold leading-none text-slate-900">
              ${product.price}
            </p>

            <p
              className={`mt-2 text-xs font-medium ${
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
