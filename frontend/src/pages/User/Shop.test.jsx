// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Shop from "./Shop";

import { useGetPublicProductsBrowseQuery } from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

vi.mock("../../redux/api/productApiSlice", () => ({
  useGetPublicProductsBrowseQuery: vi.fn(),
}));

vi.mock("../../redux/api/categoryApiSlice", () => ({
  useGetCategoriesQuery: vi.fn(),
}));

vi.mock("../../components/ProductCard", () => ({
  default: ({ product }) => (
    <article data-testid="product-card">
      <h3>{product.name}</h3>
    </article>
  ),
}));

vi.mock("../../components/Loader", () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock("../../components/Message", () => ({
  default: ({ children }) => <div role="alert">{children}</div>,
}));

const createProducts = (count) =>
  Array.from({ length: count }, (_, index) => ({
    _id: `product-${index + 1}`,
    name: `Product ${index + 1}`,
    price: 100 + index,
    brand: "Test brand",
    countInStock: 5,
    images: [],
  }));

const categories = [
  {
    _id: "category-1",
    name: "Laptops",
  },
  {
    _id: "category-2",
    name: "Phones",
  },
];

describe("Shop page", () => {
  beforeEach(() => {
    useGetCategoriesQuery.mockReturnValue({
      data: categories,
    });

    useGetPublicProductsBrowseQuery.mockReturnValue({
      data: {
        products: createProducts(10),
        page: 1,
        pages: 2,
        totalProducts: 11,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    });
  });

  it("renders server-side pagination metadata", () => {
    render(<Shop />);

    expect(screen.getByText("Matching products")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();

    expect(screen.getByText("Current page")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    expect(screen.getAllByTestId("product-card")).toHaveLength(10);
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("requests the next page when pagination button is clicked", async () => {
    render(<Shop />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(useGetPublicProductsBrowseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNumber: 2,
          pageSize: 10,
        }),
      );
    });
  });

  it("resets page to 1 when category filter changes", async () => {
    render(<Shop />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(useGetPublicProductsBrowseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNumber: 2,
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Laptops" }));

    await waitFor(() => {
      expect(useGetPublicProductsBrowseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNumber: 1,
          category: "category-1",
        }),
      );
    });
  });

  it("renders empty state when no products match filters", () => {
    useGetPublicProductsBrowseQuery.mockReturnValue({
      data: {
        products: [],
        page: 1,
        pages: 1,
        totalProducts: 0,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    render(<Shop />);

    expect(screen.getByText("No products found")).toBeInTheDocument();
    expect(
      screen.getByText("Try another search term or adjust your filters."),
    ).toBeInTheDocument();
  });

  it("renders API error state", () => {
    useGetPublicProductsBrowseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: {
        data: {
          message: "Failed from API",
        },
      },
    });

    render(<Shop />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed from API");
  });
});
