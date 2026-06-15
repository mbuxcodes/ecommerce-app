import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, selectIsAuth, selectAuthLoading, selectAuthError, clearError } from "../../features/auth/authSlice.js";
import Button from "../../components/ui/Button.jsx";
import Input  from "../../components/ui/Input.jsx";
import { FiMail, FiLock } from "react-icons/fi";

const LoginPage = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isAuth    = useSelector(selectIsAuth);
  const isLoading = useSelector(selectAuthLoading);
  const error     = useSelector(selectAuthError);

  const from = location.state?.from?.pathname || "/";

  const [formData, setFormData] = useState({
    email:    "",
    password: "",
  });

  useEffect(() => {
    if (isAuth) navigate(from, { replace: true });
    return () => { dispatch(clearError()); };
  }, [isAuth, navigate, from, dispatch]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginUser(formData));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <FiMail className="absolute left-3 top-9 text-gray-400" size={16} />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="[&_input]:pl-9"
              />
            </div>

            <div className="relative">
              <FiLock className="absolute left-3 top-9 text-gray-400" size={16} />
              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="[&_input]:pl-9"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Test Credentials */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-2">Test Credentials:</p>
          <div className="text-xs text-blue-600 space-y-1">
            <p><strong>Admin:</strong> admin@example.com / Admin123</p>
            <p><strong>Customer:</strong> shakir@example.com / Password123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;