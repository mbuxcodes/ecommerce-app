import { BrowserRouter }  from "react-router-dom";
import { Provider }       from "react-redux";
import { Toaster }        from "react-hot-toast";
import { store }          from "./app/store.js";
import AppRoutes          from "./routes/AppRoutes.jsx";
import Header             from "./components/layout/Header.jsx";
import Footer             from "./components/layout/Footer.jsx";
import { useEffect }      from "react";
import { useDispatch, useSelector } from "react-redux";
import { getMe }          from "./features/auth/authSlice.js";
import { fetchCart }      from "./features/cart/cartSlice.js";
import { fetchWishlist }  from "./features/wishlist/wishlistSlice.js";
import { selectIsAuth }   from "./features/auth/authSlice.js";

// ─── App Initializer ──────────────────────────────────────────
const AppInitializer = () => {
  const dispatch = useDispatch();
  const isAuth   = useSelector(selectIsAuth);

  useEffect(() => {
    // Try to restore session on app load
    dispatch(getMe());
  }, [dispatch]);

  useEffect(() => {
    // Fetch cart and wishlist when authenticated
    if (isAuth) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    }
  }, [isAuth, dispatch]);

  return null;
};

// ─── Main App ─────────────────────────────────────────────────
const AppContent = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppInitializer />
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#fff",
              color:       "#111827",
              border:      "1px solid #e5e7eb",
              borderRadius:"12px",
              padding:     "12px 16px",
              fontSize:    "14px",
              boxShadow:   "0 10px 15px -3px rgba(0,0,0,0.1)",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </Provider>
  );
};

export default App;