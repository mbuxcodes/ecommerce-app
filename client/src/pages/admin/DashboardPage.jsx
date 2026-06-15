import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/formatCurrency.js";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge   from "../../components/ui/Badge.jsx";
import api     from "../../services/api.js";
import {
  FiDollarSign, FiShoppingBag, FiUsers,
  FiPackage, FiAlertTriangle, FiTrendingUp,
} from "react-icons/fi";

const STATUS_BADGE = {
  pending:    "warning",
  processing: "info",
  shipped:    "purple",
  delivered:  "success",
  cancelled:  "danger",
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const navigate    = useNavigate();
  const [data,      setData]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/overview")
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Revenue"   value={formatCurrency(data?.revenue?.total || 0)} icon={FiDollarSign} color="bg-blue-500"   subtitle={`Paid: ${formatCurrency(data?.revenue?.paid || 0)}`} />
        <StatCard title="Total Orders"    value={data?.orders?.total || 0}    icon={FiShoppingBag} color="bg-purple-500" subtitle={`${data?.orders?.pending || 0} pending`} />
        <StatCard title="Total Users"     value={data?.users?.total || 0}     icon={FiUsers}       color="bg-green-500"  subtitle={`${data?.users?.customers || 0} customers`} />
        <StatCard title="Total Products"  value={data?.products?.total || 0}  icon={FiPackage}     color="bg-orange-500" subtitle={`${data?.products?.lowStock || 0} low stock`} />
      </div>

      {/* Alerts */}
      {(data?.products?.lowStock > 0 || data?.orders?.pending > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <FiAlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Attention Required</p>
            <ul className="text-yellow-700 mt-1 space-y-0.5">
              {data?.products?.lowStock > 0 && (
                <li>• {data.products.lowStock} product(s) are running low on stock</li>
              )}
              {data?.orders?.pending > 0 && (
                <li>• {data.orders.pending} order(s) are waiting to be processed</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <button
              onClick={() => navigate("/admin/orders")}
              className="text-sm text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {data?.recentOrders?.map((order) => (
              <div
                key={order._id}
                onClick={() => navigate(`/orders/${order._id}`)}
                className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-xl px-2 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{order.user?.name} • {formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_BADGE[order.status] || "default"} size="xs">
                    {order.status}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Top Products</h2>
            <button
              onClick={() => navigate("/admin/products")}
              className="text-sm text-blue-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {data?.topProducts?.map((product, idx) => (
              <div key={product._id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300 w-5">#{idx + 1}</span>
                <img
                  src={product.images?.[0]?.url}
                  alt={product.name}
                  className="w-10 h-10 object-cover rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.sold} sold</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(product.price)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {[
          { label: "Manage Orders",     path: "/admin/orders",     icon: FiShoppingBag, color: "bg-blue-50   text-blue-600"   },
          { label: "Manage Products",   path: "/admin/products",   icon: FiPackage,     color: "bg-purple-50 text-purple-600" },
          { label: "Manage Users",      path: "/admin/users",      icon: FiUsers,       color: "bg-green-50  text-green-600"  },
          { label: "Manage Categories", path: "/admin/categories", icon: FiTrendingUp,  color: "bg-orange-50 text-orange-600" },
        ].map(({ label, path, icon: Icon, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 hover:shadow-md transition-all ${color}`}
          >
            <Icon size={22} />
            <span className="text-xs font-medium text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;