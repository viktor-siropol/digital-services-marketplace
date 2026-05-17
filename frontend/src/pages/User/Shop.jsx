import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductCard from "../../components/ProductCard";
import { useGetPublicProductsQuery } from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

const sortOptions = [
  { value: "newest", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
];

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
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const sortMenuRef = useRef(null);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((item) => [item._id, item.name]));
  }, [categories]);

  const currentSortLabel = useMemo(() => {
    return (
      sortOptions.find((option) => option.value === sortBy)?.label || "Popular"
    );
  }, [sortBy]);

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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
      <div className="mx-auto max-w-420 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Browse marketplace
                </p>
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
                      Explore products
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Search by name, brand, or category and refine what you see.
                    </p>
                  </div>

                  <p className="text-sm text-slate-500">
                    {filteredProducts.length}{" "}
                    {filteredProducts.length === 1 ? "result" : "results"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-5 shadow-sm">
                  <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products, brands or categories"
                    className="h-14 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  {searchTerm.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                      aria-label="Clear search"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="relative shrink-0" ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortMenuOpen((prev) => !prev)}
                    className="inline-flex h-14 min-w-55 items-center justify-between rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span>{currentSortLabel}</span>
                    <FiChevronDown
                      className={`h-4 w-4 transition ${
                        isSortMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isSortMenuOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {sortOptions.map((option) => {
                        const isActive = sortBy === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setSortBy(option.value);
                              setIsSortMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                              isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{option.label}</span>
                            {isActive ? <FiCheck className="h-4 w-4" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </section>

          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
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