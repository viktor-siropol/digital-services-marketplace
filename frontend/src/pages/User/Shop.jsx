import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiRotateCcw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductCard from "../../components/ProductCard";
import { useGetPublicProductsBrowseQuery } from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

const DEFAULT_PAGE_SIZE = 20;

const sortOptions = [
  { value: "newest", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
];

const stockOptions = [
  { value: "all", label: "All products" },
  { value: "in-stock", label: "Available now" },
  { value: "out-of-stock", label: "Unavailable" },
];

const normalizePriceFilter = (value) => {
  if (value === "") return "";

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return "";
  }

  return String(parsedValue);
};

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("left-ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("right-ellipsis");
  }

  items.push(totalPages);

  return items;
};

const Shop = () => {
  const {
    data: categories = [],
    isLoading: loadingCategories,
    error: categoriesError,
  } = useGetCategoriesQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pageNumber, setPageNumber] = useState(1);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const sortMenuRef = useRef(null);

  const normalizedMinPrice = useMemo(
    () => normalizePriceFilter(minPrice),
    [minPrice],
  );

  const normalizedMaxPrice = useMemo(
    () => normalizePriceFilter(maxPrice),
    [maxPrice],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    activeCategory,
    stockFilter,
    normalizedMinPrice,
    normalizedMaxPrice,
    sortBy,
  ]);

  const queryParams = useMemo(
    () => ({
      pageNumber,
      pageSize: DEFAULT_PAGE_SIZE,
      keyword: debouncedSearchTerm,
      category: activeCategory,
      stock: stockFilter,
      minPrice: normalizedMinPrice,
      maxPrice: normalizedMaxPrice,
      sortBy,
    }),
    [
      pageNumber,
      debouncedSearchTerm,
      activeCategory,
      stockFilter,
      normalizedMinPrice,
      normalizedMaxPrice,
      sortBy,
    ],
  );

  const {
    data: browseData,
    isLoading,
    isFetching,
    error,
  } = useGetPublicProductsBrowseQuery(queryParams);

  const products = browseData?.products || [];
  const totalProducts = browseData?.totalProducts || 0;
  const totalPages = browseData?.pages || 1;
  const currentPage = browseData?.page || 1;
  const currentPageSize = browseData?.pageSize || DEFAULT_PAGE_SIZE;

  useEffect(() => {
    if (currentPage !== pageNumber) {
      setPageNumber(currentPage);
    }
  }, [currentPage, pageNumber]);

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

  const currentSortLabel = useMemo(() => {
    return (
      sortOptions.find((option) => option.value === sortBy)?.label || "Popular"
    );
  }, [sortBy]);

  const categoryPills = useMemo(() => {
    return [
      { label: "All", value: "all" },
      ...categories.map((item) => ({
        label: item.name,
        value: item._id,
      })),
    ];
  }, [categories]);

  const activeFilterPills = useMemo(() => {
    const pills = [];

    if (searchTerm.trim()) {
      pills.push({
        key: "search",
        label: `Search: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm(""),
      });
    }

    if (activeCategory !== "all") {
      const activeCategoryLabel =
        categoryPills.find((pill) => pill.value === activeCategory)?.label ||
        "Category";

      pills.push({
        key: "category",
        label: activeCategoryLabel,
        onRemove: () => setActiveCategory("all"),
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

    if (normalizedMinPrice !== "") {
      pills.push({
        key: "minPrice",
        label: `Min $${normalizedMinPrice}`,
        onRemove: () => setMinPrice(""),
      });
    }

    if (normalizedMaxPrice !== "") {
      pills.push({
        key: "maxPrice",
        label: `Max $${normalizedMaxPrice}`,
        onRemove: () => setMaxPrice(""),
      });
    }

    return pills;
  }, [
    searchTerm,
    activeCategory,
    stockFilter,
    normalizedMinPrice,
    normalizedMaxPrice,
    categoryPills,
  ]);

  const hasActiveFilters = activeFilterPills.length > 0;

  const paginationItems = useMemo(() => {
    return buildPaginationItems(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const currentRangeStart =
    totalProducts === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;

  const currentRangeEnd =
    totalProducts === 0
      ? 0
      : Math.min(totalProducts, currentPage * currentPageSize);

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setActiveCategory("all");
    setStockFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setPageNumber(1);
    setIsSortMenuOpen(false);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }

    setPageNumber(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading || loadingCategories) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error || categoriesError) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message ||
            categoriesError?.data?.message ||
            error?.error ||
            categoriesError?.error ||
            "Failed to load products"}
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
                      Search by name, brand, category, price, and real-time
                      availability.
                    </p>
                  </div>

                  <div className="text-sm text-slate-500">
                    {isFetching
                      ? "Updating results..."
                      : `${totalProducts} results`}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Matching products
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {totalProducts}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Current page
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {currentPage} / {totalPages}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Showing
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {currentRangeStart}-{currentRangeEnd}
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

              <div className="flex flex-col gap-3">
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

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px_auto]">
                  <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-2">
                    {stockOptions.map((option) => {
                      const isActive = stockFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStockFilter(option.value)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            isActive
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:bg-white hover:text-slate-900"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-2">
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min price"
                      className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max price"
                      className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <FiRotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
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
          </section>

          {products.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                No products found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term or adjust your filters.
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    showFavoriteAffordance
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:flex-row sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing {currentRangeStart}-{currentRangeEnd} of{" "}
                  {totalProducts} products
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  {paginationItems.map((item, index) => {
                    if (typeof item !== "number") {
                      return (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex h-10 min-w-10 items-center justify-center px-2 text-sm text-slate-400"
                        >
                          …
                        </span>
                      );
                    }

                    const isActive = item === currentPage;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handlePageChange(item)}
                        className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition ${
                          isActive
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
