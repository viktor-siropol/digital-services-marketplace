import { useMemo } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  useAddProductToFavoritesMutation,
  useGetMyFavoriteProductsQuery,
  useRemoveProductFromFavoritesMutation,
} from "../../redux/api/favoriteApiSlice";

const overlayInactiveIconStyle = {
  stroke: "rgba(0,0,0,0.95)",
  strokeWidth: 24,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.85))",
};

const overlayActiveIconStyle = {
  stroke: "rgba(255,255,255,0.65)",
  strokeWidth: 14,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.45))",
};

const scaleSoftIconSizeClassName = (sizeClassName) => {
  switch (sizeClassName) {
    case "text-sm":
      return "text-base";
    case "text-base":
      return "text-lg";
    case "text-lg":
      return "text-2xl";
    case "text-xl":
      return "text-3xl";
    case "text-2xl":
      return "text-4xl";
    default:
      return sizeClassName;
  }
};

const FavoriteButton = ({
  productId,
  variant = "overlay",
  iconSizeClassName,
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);

  const { data: favoriteProducts = [] } = useGetMyFavoriteProductsQuery(
    undefined,
    {
      skip: !userInfo,
    },
  );

  const [addProductToFavorites, { isLoading: addingFavorite }] =
    useAddProductToFavoritesMutation();

  const [removeProductFromFavorites, { isLoading: removingFavorite }] =
    useRemoveProductFromFavoritesMutation();

  const isFavorited = useMemo(() => {
    return favoriteProducts.some((product) => product._id === productId);
  }, [favoriteProducts, productId]);

  const isBusy = addingFavorite || removingFavorite;

  const baseIconSizeClassName =
    iconSizeClassName || (variant === "soft" ? "text-lg" : "text-3xl");

  const resolvedIconSizeClassName =
    variant === "soft"
      ? scaleSoftIconSizeClassName(baseIconSizeClassName)
      : baseIconSizeClassName;

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      navigate(`/login?redirect=${location.pathname}`);
      return;
    }

    try {
      if (isFavorited) {
        await removeProductFromFavorites(productId).unwrap();
        toast.success("Removed from favorites");
      } else {
        await addProductToFavorites(productId).unwrap();
        toast.success("Added to favorites");
      }
    } catch (error) {
      toast.error(
        error?.data?.message || error?.error || "Failed to update favorites",
      );
    }
  };

  const buttonClassName =
    variant === "soft"
      ? `inline-flex shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:scale-105 hover:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${
          isFavorited ? "text-rose-500 hover:text-rose-600" : ""
        }`
      : "inline-flex items-center justify-center p-1 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={handleToggleFavorite}
      disabled={isBusy}
      className={`${buttonClassName} ${className}`}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {variant === "soft" ? (
        isFavorited ? (
          <FaHeart className={`${resolvedIconSizeClassName} text-rose-500`} />
        ) : (
          <FaRegHeart
            className={`${resolvedIconSizeClassName} text-slate-300`}
          />
        )
      ) : isFavorited ? (
        <FaHeart
          className={`${resolvedIconSizeClassName} text-rose-500`}
          style={overlayActiveIconStyle}
        />
      ) : (
        <FaRegHeart
          className={`${resolvedIconSizeClassName} text-white`}
          style={overlayInactiveIconStyle}
        />
      )}
    </button>
  );
};

export default FavoriteButton;
