import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";
import toast from "react-hot-toast";

export const fetchCart = createAsyncThunk(
  "cart/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/cart");
      return response.data.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const addToCart = createAsyncThunk(
  "cart/add",
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.post("/cart", { productId, quantity });
      return response.data.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateCartItem = createAsyncThunk(
  "cart/update",
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/cart/${itemId}`, { quantity });
      return response.data.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const removeFromCart = createAsyncThunk(
  "cart/remove",
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/cart/${itemId}`);
      return response.data.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const clearCart = createAsyncThunk(
  "cart/clear",
  async (_, { rejectWithValue }) => {
    try {
      await api.delete("/cart");
      return { items: [], totalItems: 0, totalPrice: 0 };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items:      [],
    totalItems: 0,
    totalPrice: 0,
    isLoading:  false,
    error:      null,
  },
  reducers: {
    resetCart: (state) => {
      state.items      = [];
      state.totalItems = 0;
      state.totalPrice = 0;
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.isLoading = true;
      state.error     = null;
    };

    const handleFulfilled = (state, action) => {
      state.isLoading  = false;
      state.items      = action.payload?.items      || [];
      state.totalItems = action.payload?.totalItems || 0;
      state.totalPrice = action.payload?.totalPrice || 0;
    };

    const handleRejected = (state, action) => {
      state.isLoading = false;
      state.error     = action.payload;
      toast.error(action.payload || "Cart operation failed");
    };

    builder
      .addCase(fetchCart.pending,   handlePending)
      .addCase(fetchCart.fulfilled, handleFulfilled)
      .addCase(fetchCart.rejected,  handleRejected)

      .addCase(addToCart.pending,   handlePending)
      .addCase(addToCart.fulfilled, (state, action) => {
        handleFulfilled(state, action);
        toast.success("Added to cart!");
      })
      .addCase(addToCart.rejected,  handleRejected)

      .addCase(updateCartItem.pending,   handlePending)
      .addCase(updateCartItem.fulfilled, handleFulfilled)
      .addCase(updateCartItem.rejected,  handleRejected)

      .addCase(removeFromCart.pending,   handlePending)
      .addCase(removeFromCart.fulfilled, (state, action) => {
        handleFulfilled(state, action);
        toast.success("Item removed from cart");
      })
      .addCase(removeFromCart.rejected,  handleRejected)

      .addCase(clearCart.pending,   handlePending)
      .addCase(clearCart.fulfilled, handleFulfilled)
      .addCase(clearCart.rejected,  handleRejected);
  },
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;

export const selectCartItems      = (state) => state.cart.items;
export const selectCartTotalItems = (state) => state.cart.totalItems;
export const selectCartTotalPrice = (state) => state.cart.totalPrice;
export const selectCartLoading    = (state) => state.cart.isLoading;