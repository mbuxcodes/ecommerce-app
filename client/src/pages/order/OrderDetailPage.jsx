import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCurrency, formatDateTime } from "../../utils/formatCurrency.js";
import Badge   from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Button  from "../../components/ui/Button.jsx";
import api     from "../../services/api.js";
import toast   from "react-hot-toast";
import { FiPackage, FiMapPin, FiCreditCard, FiArrowLeft } from "react-icons/fi";

const STATUS_BADGE = {
  pending:    "warning",
  processing: "info",
  shipped:    "purple",
  delivered:  "success",
  cancelled:  "danger",
};

const OrderDetailPage = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [order,     setOrder]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelling,setCancelling]= useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then((res) => setOrder(res.data.data.order))
      .catch(() => navigate("/orders"))
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      const res = await api.post(`/orders/${id}/cancel`);
      setOrder(res.data.data.order);
      toast.success("Order cancelled successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/orders")}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <FiArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="text-sm text-gray-400">{formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={STATUS_BADGE[order.status] || "default"} size="md">
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <FiMapPin size={16} className="text-blue-600" />
            Shipping Address
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">{order.shippingAddress?.fullName}</p>
            <p>{order.shippingAddress?.street}</p>
            <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}</p>
            <p>{order.shippingAddress?.country}</p>
            <p className="text-gray-400">{order.shippingAddress?.phone}</p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <FiCreditCard size={16} className="text-blue-600" />
            Payment Info
          </h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Method</span>
              <span className="font-medium capitalize">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : "Card"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium ${order.isPaid ? "text-green-600" : "text-orange-500"}`}>
                {order.isPaid ? `Paid on ${formatDateTime(order.paidAt)}` : "Pending"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span className={`font-medium ${order.isDelivered ? "text-green-600" : "text-gray-600"}`}>
                {order.isDelivered ? `Delivered ${formatDateTime(order.deliveredAt)}` : "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FiPackage size={16} className="text-blue-600" />
          Order Items ({order.items?.length})
        </h3>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item._id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 object-cover rounded-xl"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">{item.name}</p>
                <p className="text-gray-400 text-xs">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
              </div>
              <p className="font-semibold text-gray-900 text-sm">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(order.itemsPrice)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span className={order.shippingPrice === 0 ? "text-green-600" : ""}>
              {order.shippingPrice === 0 ? "FREE" : formatCurrency(order.shippingPrice)}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span><span>{formatCurrency(order.taxPrice)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
            <span>Total</span><span>{formatCurrency(order.totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      {["pending", "processing"].includes(order.status) && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={handleCancel}
            loading={cancelling}
          >
            Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;