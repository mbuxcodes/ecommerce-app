import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";
import toast from "react-hot-toast";

export const fetchWishlist = createAsyncThunk(
  "wishlist/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/wishlist");
      return response.data.data.wishlist;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const addToWishlist = createAsyncThunk(
  "wishlist/add",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.post("/wishlist", { productId });
      return response.data.data.wishlist;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  "wishlist/remove",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/wishlist/${productId}`);
      return response.data.data.wishlist;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: {
    products:   [],
    totalItems: 0,
    isLoading:  false,
  },
  reducers: {},
  extraReducers: (builder) => {
    const handleFulfilled = (state, action) => {
      state.isLoading  = false;
      state.products   = action.payload?.products   || [];
      state.totalItems = action.payload?.totalItems || 0;
    };

    builder
      .addCase(fetchWishlist.pending,  (state) => { state.isLoading = true; })
      .addCase(fetchWishlist.fulfilled, handleFulfilled)
      .addCase(fetchWishlist.rejected,  (state) => { state.isLoading = false; })

      .addCase(addToWishlist.fulfilled, (state, action) => {
        handleFulfilled(state, action);
        toast.success("Added to wishlist!");
      })
      .addCase(addToWishlist.rejected, (_, action) => {
        toast.error(action.payload || "Failed to add to wishlist");
      })

      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        handleFulfilled(state, action);
        toast.success("Removed from wishlist");
      });
  },
});

export default wishlistSlice.reducer;

export const selectWishlistProducts  = (state) => state.wishlist.products;
export const selectWishlistTotalItems= (state) => state.wishlist.totalItems;
export const selectWishlistLoading   = (state) => state.wishlist.isLoading;