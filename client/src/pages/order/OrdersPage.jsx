import { useEffect, useState }       from "react";
import { useNavigate }               from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/formatCurrency.js";
import Badge   from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api     from "../../services/api.js";
import { FiPackage, FiChevronRight } from "react-icons/fi";

const STATUS_BADGE = {
  pending:    "warning",
  processing: "info",
  shipped:    "purple",
  delivered:  "success",
  cancelled:  "danger",
};

const OrdersPage = () => {
  const navigate    = useNavigate();
  const [orders,    setOrders]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get("/orders")
      .then((res) => setOrders(res.data.data.orders || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiPackage size={64} className="text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-700">No orders yet</h2>
        <p className="text-gray-400">Your order history will appear here</p>
        <button
          onClick={() => navigate("/products")}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order._id}
            onClick={() => navigate(`/orders/${order._id}`)}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                <p className="text-sm text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_BADGE[order.status] || "default"}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                <FiChevronRight size={18} className="text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500 capitalize">{order.paymentMethod}</span>
                <span className="text-gray-300">•</span>
                <span className={`font-medium ${order.isPaid ? "text-green-600" : "text-orange-500"}`}>
                  {order.isPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
              <span className="font-bold text-gray-900">
                {formatCurrency(order.totalPrice)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersPage;