import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

export const fetchProducts = createAsyncThunk(
  "product/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/products", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchProductBySlug = createAsyncThunk(
  "product/fetchBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get(`/products/slug/${slug}`);
      return response.data.data.product;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchFeaturedProducts = createAsyncThunk(
  "product/fetchFeatured",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/products/featured");
      return response.data.data.products;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const productSlice = createSlice({
  name: "product",
  initialState: {
    products:         [],
    featuredProducts: [],
    currentProduct:   null,
    pagination:       null,
    isLoading:        false,
    error:            null,
  },
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending,   (state) => { state.isLoading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading  = false;
        state.products   = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.payload;
      })

      .addCase(fetchProductBySlug.pending,   (state) => { state.isLoading = true; })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.isLoading     = false;
        state.currentProduct= action.payload;
      })
      .addCase(fetchProductBySlug.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.payload;
      })

      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload;
      });
  },
});

export const { clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;

export const selectProducts         = (state) => state.product.products;
export const selectFeaturedProducts = (state) => state.product.featuredProducts;
export const selectCurrentProduct   = (state) => state.product.currentProduct;
export const selectProductPagination= (state) => state.product.pagination;
export const selectProductLoading   = (state) => state.product.isLoading;