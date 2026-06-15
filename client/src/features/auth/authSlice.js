import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";
import toast from "react-hot-toast";

// ─── Async Thunks ──────────────────────────────────────────────
export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Logout failed"
      );
    }
  }
);

export const getMe = createAsyncThunk(
  "auth/getMe",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get user"
      );
    }
  }
);

// ─── Initial State ─────────────────────────────────────────────
const initialState = {
  user:        null,
  accessToken: null,
  isLoading:   false,
  isAuth:      false,
  error:       null,
};

// ─── Auth Slice ────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      if (user)        state.user        = user;
      if (accessToken) state.accessToken = accessToken;
      state.isAuth = true;
    },
    logout: (state) => {
      state.user        = null;
      state.accessToken = null;
      state.isAuth      = false;
      state.error       = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading  = false;
        state.user       = action.payload.user;
        state.accessToken= action.payload.accessToken;
        state.isAuth     = true;
        toast.success("Account created successfully!");
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload;
        toast.error(action.payload);
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading  = false;
        state.user       = action.payload.user;
        state.accessToken= action.payload.accessToken;
        state.isAuth     = true;
        toast.success("Logged in successfully!");
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload;
        toast.error(action.payload);
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user        = null;
        state.accessToken = null;
        state.isAuth      = false;
        toast.success("Logged out successfully!");
      });

    // Get Me
    builder
      .addCase(getMe.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user      = action.payload.user;
        state.isAuth    = true;
      })
      .addCase(getMe.rejected, (state) => {
        state.isLoading  = false;
        state.user       = null;
        state.accessToken= null;
        state.isAuth     = false;
      });
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;
export default authSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────
export const selectUser        = (state) => state.auth.user;
export const selectIsAuth      = (state) => state.auth.isAuth;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError   = (state) => state.auth.error;
export const selectIsAdmin     = (state) => state.auth.user?.role === "admin";