import { apiSlice } from "./apiSlice";
import { PRODUCTS_URL } from "../constans";

const normalizeArrayParam = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [value].filter(Boolean);
};

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    addProduct: builder.mutation({
      query: (data) => ({
        url: PRODUCTS_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Product"],
    }),

    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({
        url: `${PRODUCTS_URL}/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Product",
        { type: "Product", id },
      ],
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `${PRODUCTS_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        "Product",
        { type: "Product", id },
      ],
    }),

    createProductReview: builder.mutation({
      query: ({ productId, rating, comment }) => ({
        url: `${PRODUCTS_URL}/${productId}/reviews`,
        method: "POST",
        body: { rating, comment },
      }),
      invalidatesTags: (result, error, { productId }) => [
        "Product",
        { type: "Product", id: productId },
      ],
    }),

    getPublicProducts: builder.query({
      query: () => PRODUCTS_URL,
      providesTags: ["Product"],
      keepUnusedDataFor: 5,
    }),

    getPublicProductsBrowse: builder.query({
      query: ({
        pageNumber = 1,
        pageSize = 10,
        keyword = "",
        categories = [],
        category = "",
        stock = [],
        stockFilter = "",
        sortBy = "newest",
        minPrice = "",
        maxPrice = "",
      } = {}) => {
        const params = new URLSearchParams();

        params.set("pageNumber", pageNumber);
        params.set("pageSize", pageSize);

        const selectedCategories = normalizeArrayParam(categories).filter(
          (value) => value !== "all",
        );

        if (selectedCategories.length === 0 && category && category !== "all") {
          selectedCategories.push(category);
        }

        const selectedStockFilters = normalizeArrayParam(stock).filter(
          (value) => value !== "all",
        );

        if (
          selectedStockFilters.length === 0 &&
          stockFilter &&
          stockFilter !== "all"
        ) {
          selectedStockFilters.push(stockFilter);
        }

        if (keyword) params.set("keyword", keyword);
        if (selectedCategories.length > 0) {
          params.set("categories", selectedCategories.join(","));
        }
        if (selectedStockFilters.length > 0) {
          params.set("stock", selectedStockFilters.join(","));
        }
        if (sortBy) params.set("sortBy", sortBy);
        if (minPrice !== "") params.set("minPrice", minPrice);
        if (maxPrice !== "") params.set("maxPrice", maxPrice);

        return `${PRODUCTS_URL}/browse?${params.toString()}`;
      },
      providesTags: ["Product"],
      keepUnusedDataFor: 5,
    }),

    getPublicProductById: builder.query({
      query: (id) => `${PRODUCTS_URL}/p/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
      keepUnusedDataFor: 5,
    }),

    getMyProducts: builder.query({
      query: () => `${PRODUCTS_URL}/mine`,
      providesTags: ["Product"],
      keepUnusedDataFor: 5,
    }),

    getMyProductById: builder.query({
      query: (id) => `${PRODUCTS_URL}/manage/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
      keepUnusedDataFor: 5,
    }),

    retryProductImageProcessing: builder.mutation({
      query: (id) => ({
        url: `${PRODUCTS_URL}/${id}/retry-processing`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        "Product",
        { type: "Product", id },
      ],
    }),

    getProductsPendingReview: builder.query({
      query: () => `${PRODUCTS_URL}/admin/pending-review`,
      providesTags: ["Product"],
      keepUnusedDataFor: 5,
    }),

    approveProduct: builder.mutation({
      query: (id) => ({
        url: `${PRODUCTS_URL}/admin/${id}/approve`,
        method: "PUT",
      }),
      invalidatesTags: ["Product"],
    }),

    rejectProduct: builder.mutation({
      query: ({ id, reason }) => ({
        url: `${PRODUCTS_URL}/admin/${id}/reject`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: ["Product"],
    }),
  }),
});

export const {
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateProductReviewMutation,
  useGetPublicProductsQuery,
  useGetPublicProductsBrowseQuery,
  useGetPublicProductByIdQuery,
  useGetMyProductsQuery,
  useGetMyProductByIdQuery,
  useRetryProductImageProcessingMutation,
  useGetProductsPendingReviewQuery,
  useApproveProductMutation,
  useRejectProductMutation,
} = productApiSlice;
