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

const inactiveIconStyle = {
  stroke: "rgba(0,0,0,0.95)",
  strokeWidth: 24,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.85))",
};

const activeIconStyle = {
  stroke: "rgba(255,255,255,0.65)",
  strokeWidth: 14,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.45))",
};

const FavoriteButton = ({
  productId,
  iconSizeClassName = "text-[28px]",
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

  return (
    <button
      type="button"
      onClick={handleToggleFavorite}
      disabled={isBusy}
      className={`inline-flex items-center justify-center p-1 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {isFavorited ? (
        <FaHeart
          className={`${iconSizeClassName} text-rose-500`}
          style={activeIconStyle}
        />
      ) : (
        <FaRegHeart
          className={`${iconSizeClassName} text-white`}
          style={inactiveIconStyle}
        />
      )}
    </button>
  );
};

export default FavoriteButton;
