import { apiSlice } from "./apiSlice";
import { PRODUCTS_URL } from "../constans";

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

    getPublicProducts: builder.query({
      query: () => PRODUCTS_URL,
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
  }),
});

export const {
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetPublicProductsQuery,
  useGetPublicProductByIdQuery,
  useGetMyProductsQuery,
  useGetMyProductByIdQuery,
  useRetryProductImageProcessingMutation,
} = productApiSlice;
