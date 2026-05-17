import { apiSlice } from "./apiSlice";
import { FAVORITES_URL } from "../constans";

export const favoriteApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyFavoriteProducts: builder.query({
      query: () => FAVORITES_URL,
      providesTags: ["Favorite"],
      keepUnusedDataFor: 5,
    }),

    addProductToFavorites: builder.mutation({
      query: (productId) => ({
        url: `${FAVORITES_URL}/${productId}`,
        method: "POST",
      }),
      invalidatesTags: ["Favorite"],
    }),

    removeProductFromFavorites: builder.mutation({
      query: (productId) => ({
        url: `${FAVORITES_URL}/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Favorite"],
    }),
  }),
});

export const {
  useGetMyFavoriteProductsQuery,
  useAddProductToFavoritesMutation,
  useRemoveProductFromFavoritesMutation,
} = favoriteApiSlice;
