import { apiSlice } from "./apiSlice";
import { PRODUCTS_URL } from "../constans";

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    addProduct: builder.mutation({
      query: (data) => ({
        url: `${[PRODUCTS_URL]}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Product"],
    }),
  }),
});
