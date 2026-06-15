import { lazy, Suspense } from "react";
import { Routes, Route }  from "react-router-dom";
import Spinner from "../components/ui/Spinner.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminRoute     from "./AdminRoute.jsx";
import NotFoundPage from "../pages/shop/NotFoundPage.jsx";


// ─── Lazy Loading ──────────────────────────────────────────────
const HomePage           = lazy(() => import("../pages/shop/HomePage.jsx"));
const ProductListPage    = lazy(() => import("../pages/shop/ProductListPage.jsx"));
const ProductDetailPage  = lazy(() => import("../pages/shop/ProductDetailPage.jsx"));
const CartPage           = lazy(() => import("../pages/shop/CartPage.jsx"));
const WishlistPage       = lazy(() => import("../pages/shop/WishlistPage.jsx"));
const CheckoutPage       = lazy(() => import("../pages/shop/CheckoutPage.jsx"));
const LoginPage          = lazy(() => import("../pages/auth/LoginPage.jsx"));
const RegisterPage       = lazy(() => import("../pages/auth/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage.jsx"));
const OrdersPage         = lazy(() => import("../pages/order/OrdersPage.jsx"));
const OrderDetailPage    = lazy(() => import("../pages/order/OrderDetailPage.jsx"));
const AdminDashboard     = lazy(() => import("../pages/admin/DashboardPage.jsx"));
const AdminProducts      = lazy(() => import("../pages/admin/AdminProductsPage.jsx"));
const AdminOrders        = lazy(() => import("../pages/admin/AdminOrdersPage.jsx"));
const AdminUsers         = lazy(() => import("../pages/admin/AdminUsersPage.jsx"));
const AdminCategories    = lazy(() => import("../pages/admin/AdminCategoriesPage.jsx"));


const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner size="lg" />
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/"                    element={<HomePage />} />
        <Route path="/products"            element={<ProductListPage />} />
        <Route path="/products/:slug"      element={<ProductDetailPage />} />
        <Route path="/cart"                element={<CartPage />} />
        <Route path="/login"               element={<LoginPage />} />
        <Route path="/register"            element={<RegisterPage />} />
        <Route path="/forgot-password"     element={<ForgotPasswordPage />} />

        {/* Protected Routes */}
        <Route path="/wishlist" element={
          <ProtectedRoute><WishlistPage /></ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute><CheckoutPage /></ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute><OrdersPage /></ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/products" element={
          <AdminRoute><AdminProducts /></AdminRoute>
        } />
        <Route path="/admin/orders" element={
          <AdminRoute><AdminOrders /></AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute><AdminUsers /></AdminRoute>
        } />
        <Route path="/admin/categories" element={
          <AdminRoute><AdminCategories /></AdminRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;