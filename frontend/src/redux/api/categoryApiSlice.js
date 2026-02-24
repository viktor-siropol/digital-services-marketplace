import { apiSlice } from "./apiSlice";
import { CATEGORY_URL } from "../constans.js";

export const categoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createCategory: builder.mutation({
      query: (newCategory) => ({
        url: CATEGORY_URL,
        method: "POST",
        body: newCategory,
      }),
      invalidatesTags: ["Category"],
    }),

    getCategories: builder.query({
      query: () => ({
        url: CATEGORY_URL,
      }),
      providesTags: ["Category"],
      keepUnusedDataFor: 5,
    }),

    updateCategory: builder.mutation({
      query: ({ id, name }) => ({
        url: `${CATEGORY_URL}/${id}`,
        method: "PUT",
        body: { name },
      }),
      invalidatesTags: ["Category"],
    }),

    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `${CATEGORY_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Category"],
    }),
  }),
});

export const {
  useCreateCategoryMutation,
  useGetCategoriesQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} = categoryApiSlice;
