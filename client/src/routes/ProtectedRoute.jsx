import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuth } from "../features/auth/authSlice.js";
import Spinner from "../components/ui/Spinner.jsx";
import { selectAuthLoading } from "../features/auth/authSlice.js";

const ProtectedRoute = ({ children }) => {
  const isAuth    = useSelector(selectIsAuth);
  const isLoading = useSelector(selectAuthLoading);
  const location  = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;