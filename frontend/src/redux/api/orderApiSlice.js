import { apiSlice } from "./apiSlice";
import { ORDERS_URL } from "../constans";

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (data) => ({
        url: ORDERS_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Order", "Product"],
    }),

    getMyOrders: builder.query({
      query: () => `${ORDERS_URL}/mine`,
      providesTags: ["Order"],
      keepUnusedDataFor: 5,
    }),

    getOrderById: builder.query({
      query: (id) => `${ORDERS_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
      keepUnusedDataFor: 5,
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
} = orderApiSlice;
