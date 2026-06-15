import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuth, selectIsAdmin } from "../features/auth/authSlice.js";
import Spinner from "../components/ui/Spinner.jsx";
import { selectAuthLoading } from "../features/auth/authSlice.js";

const AdminRoute = ({ children }) => {
  const isAuth    = useSelector(selectIsAuth);
  const isAdmin   = useSelector(selectIsAdmin);
  const isLoading = useSelector(selectAuthLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuth)   return <Navigate to="/login"  replace />;
  if (!isAdmin)  return <Navigate to="/"       replace />;

  return children;
};

export default AdminRoute;