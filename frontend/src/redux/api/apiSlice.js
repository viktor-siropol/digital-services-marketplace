import { fetchBaseQuery, createApi, retry } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../constans";

const apiBaseUrl = import.meta.env.VITE_API_URL || BASE_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
});

const baseQueryWithSelectiveRetry = retry(
  async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (result.error) {
      const status = result.error.status;

      if (typeof status === "number" && status >= 400 && status < 500) {
        retry.fail(result.error, result.meta);
      }
    }

    return result;
  },
  { maxRetries: 2 },
);

export const apiSlice = createApi({
  baseQuery: baseQueryWithSelectiveRetry,
  tagTypes: ["Product", "Order", "User", "Category", "Favorite"],
  endpoints: () => ({}),
});
