import { createSlice } from "@reduxjs/toolkit";

const CART_STORAGE_KEY = "cartItems";

const readCartItemsFromStorage = () => {
  if (typeof window === "undefined") return [];

  try {
    const storedCartItems = localStorage.getItem(CART_STORAGE_KEY);

    if (!storedCartItems) {
      return [];
    }

    const parsedCartItems = JSON.parse(storedCartItems);

    return Array.isArray(parsedCartItems) ? parsedCartItems : [];
  } catch {
    return [];
  }
};

const persistCartItems = (cartItems) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
};

const initialState = {
  cartItems: readCartItemsFromStorage(),
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const incomingItem = action.payload;

      if (!incomingItem?.product) {
        return;
      }

      const countInStock = Math.max(0, Number(incomingItem.countInStock || 0));

      if (countInStock === 0) {
        return;
      }

      const qtyToAdd = Math.min(
        countInStock,
        Math.max(1, Number(incomingItem.qty || 1)),
      );

      const existingItem = state.cartItems.find(
        (item) => item.product === incomingItem.product,
      );

      if (existingItem) {
        existingItem.qty = Math.min(countInStock, existingItem.qty + qtyToAdd);
        existingItem.name = incomingItem.name;
        existingItem.image = incomingItem.image;
        existingItem.price = Number(incomingItem.price);
        existingItem.countInStock = countInStock;
      } else {
        state.cartItems.push({
          product: incomingItem.product,
          name: incomingItem.name,
          image: incomingItem.image || "",
          price: Number(incomingItem.price),
          countInStock,
          qty: qtyToAdd,
        });
      }

      persistCartItems(state.cartItems);
    },

    removeFromCart: (state, action) => {
      const productId = action.payload;

      state.cartItems = state.cartItems.filter(
        (item) => item.product !== productId,
      );

      persistCartItems(state.cartItems);
    },

    updateCartItemQty: (state, action) => {
      const { productId, qty } = action.payload;

      const item = state.cartItems.find((entry) => entry.product === productId);

      if (!item) {
        return;
      }

      const normalizedQty = Math.max(
        1,
        Math.min(Number(item.countInStock || 0), Number(qty || 1)),
      );

      item.qty = normalizedQty;

      persistCartItems(state.cartItems);
    },

    clearCart: (state) => {
      state.cartItems = [];
      persistCartItems(state.cartItems);
    },
  },
});

export const { addToCart, removeFromCart, updateCartItemQty, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
