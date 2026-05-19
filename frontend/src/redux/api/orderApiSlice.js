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

    getPayPalClientId: builder.query({
      query: () => `${ORDERS_URL}/paypal/client-id`,
      keepUnusedDataFor: 5,
    }),

    createPayPalOrder: builder.mutation({
      query: (orderId) => ({
        url: `${ORDERS_URL}/${orderId}/paypal/create`,
        method: "POST",
      }),
      invalidatesTags: (result, error, orderId) => [
        "Order",
        { type: "Order", id: orderId },
      ],
    }),

    capturePayPalOrder: builder.mutation({
      query: ({ orderId, paypalOrderId }) => ({
        url: `${ORDERS_URL}/${orderId}/paypal/capture`,
        method: "PUT",
        body: { paypalOrderId },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        "Order",
        "Product",
        { type: "Order", id: orderId },
      ],
    }),

    cancelOrder: builder.mutation({
      query: (orderId) => ({
        url: `${ORDERS_URL}/${orderId}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, orderId) => [
        "Order",
        "Product",
        { type: "Order", id: orderId },
      ],
    }),

    getMySalesOrders: builder.query({
      query: () => `${ORDERS_URL}/sales`,
      providesTags: ["Order"],
      keepUnusedDataFor: 5,
    }),

    getSalesOrderById: builder.query({
      query: (id) => `${ORDERS_URL}/sales/${id}`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
      keepUnusedDataFor: 5,
    }),

    updateSellerOrderStatus: builder.mutation({
      query: ({ orderId, productId, nextStatus }) => ({
        url: `${ORDERS_URL}/${orderId}/status`,
        method: "PUT",
        body: { productId, nextStatus },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        "Order",
        { type: "Order", id: orderId },
      ],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
  useGetPayPalClientIdQuery,
  useCreatePayPalOrderMutation,
  useCapturePayPalOrderMutation,
  useCancelOrderMutation,
  useGetMySalesOrdersQuery,
  useGetSalesOrderByIdQuery,
  useUpdateSellerOrderStatusMutation,
} = orderApiSlice;
