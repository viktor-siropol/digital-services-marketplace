import { fetchBaseQuery, createApi, retry } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../constans";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
});

const baseQueryWithRetry = retry(rawBaseQuery, { maxRetries: 2 });

export const apiSlice = createApi({
  baseQuery: baseQueryWithRetry,
  tagTypes: ["Product", "Order", "User", "Category"],
  endpoints: () => ({}),
});
