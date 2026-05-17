import { Link } from "react-router-dom";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductCard from "../../components/ProductCard";
import { useGetMyFavoriteProductsQuery } from "../../redux/api/favoriteApiSlice";

const Favorites = () => {
  const {
    data: favoriteProducts = [],
    isLoading,
    error,
  } = useGetMyFavoriteProductsQuery();

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
          {error?.data?.message || error?.error || "Failed to load favorites"}
        </Message>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-1680px px-4 py-6 md:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight text-slate-900">
                Favorites
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {favoriteProducts.length}{" "}
                {favoriteProducts.length === 1
                  ? "saved product"
                  : "saved products"}
              </p>
            </div>

            <Link
              to="/shop"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Continue browsing
            </Link>
          </div>

          {favoriteProducts.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                No favorites yet
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Save products you want to revisit later.
              </p>
              <Link
                to="/shop"
                className="mt-6 inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Explore products
              </Link>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {favoriteProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;
