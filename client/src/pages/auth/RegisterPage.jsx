import { useState, useEffect } from "react";
import { Link, useNavigate }   from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  registerUser,
  selectIsAuth,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from "../../features/auth/authSlice.js";
import Button from "../../components/ui/Button.jsx";
import Input  from "../../components/ui/Input.jsx";

const RegisterPage = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const isAuth    = useSelector(selectIsAuth);
  const isLoading = useSelector(selectAuthLoading);
  const error     = useSelector(selectAuthError);

  const [formData, setFormData] = useState({
    name:            "",
    email:           "",
    password:        "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isAuth) navigate("/");
    return () => { dispatch(clearError()); };
  }, [isAuth, navigate, dispatch]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Must contain uppercase, lowercase and number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { confirmPassword, ...userData } = formData;
    dispatch(registerUser(userData));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create account
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Start shopping today — it's free!
            </p>
          </div>

          {/* Server Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Shakir Ahmed"
              error={errors.name}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={errors.email}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 8 chars, uppercase & number"
              error={errors.password}
              required
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              size="lg"
              className="mt-2"
            >
              Create Account
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Password Requirements */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-2">
            Password Requirements:
          </p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li className={formData.password.length >= 8 ? "text-green-600" : ""}>
              {formData.password.length >= 8 ? "✅" : "○"} At least 8 characters
            </li>
            <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : ""}>
              {/[A-Z]/.test(formData.password) ? "✅" : "○"} One uppercase letter
            </li>
            <li className={/[a-z]/.test(formData.password) ? "text-green-600" : ""}>
              {/[a-z]/.test(formData.password) ? "✅" : "○"} One lowercase letter
            </li>
            <li className={/\d/.test(formData.password) ? "text-green-600" : ""}>
              {/\d/.test(formData.password) ? "✅" : "○"} One number
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;