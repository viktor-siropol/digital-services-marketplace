import { useMemo, useState } from "react";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductCard from "../../components/ProductCard";
import { useGetPublicProductsQuery } from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

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

const Shop = () => {
  const { data: products = [], isLoading, error } = useGetPublicProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((item) => [item._id, item.name]));
  }, [categories]);

  const filteredProducts = useMemo(() => {
    let items = [...products];

    if (activeCategory !== "all") {
      items = items.filter(
        (product) => getCategoryId(product) === activeCategory,
      );
    }

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

    switch (sortBy) {
      case "price-asc":
        items.sort((a, b) => Number(a.price) - Number(b.price));
        break;

      case "price-desc":
        items.sort((a, b) => Number(b.price) - Number(a.price));
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
  }, [products, activeCategory, searchTerm, sortBy, categoryNameById]);

  const categoryPills = useMemo(() => {
    return [
      { label: "All", value: "all" },
      ...categories.map((item) => ({
        label: item.name,
        value: item._id,
      })),
    ];
  }, [categories]);

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
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-1680px px-4 py-6 md:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-14 min-w-0 flex-1 items-center rounded-full border border-slate-200 bg-white px-5 shadow-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products, brands or categories"
                  className="h-full w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-14 rounded-full border border-slate-200 bg-white px-5 text-sm text-slate-700 outline-none shadow-sm"
                >
                  <option value="newest">Popular</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {categoryPills.map((pill) => {
              const isActive = activeCategory === pill.value;

              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setActiveCategory(pill.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight text-slate-900">
                Explore products
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "result" : "results"}
              </p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                No products found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term or choose a different category.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showFavoriteAffordance
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
