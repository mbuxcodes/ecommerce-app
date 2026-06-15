import { useEffect, useState }       from "react";
import { useNavigate }               from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/formatCurrency.js";
import Badge   from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import api     from "../../services/api.js";
import toast   from "react-hot-toast";
import { FiSearch, FiEye, FiRefreshCw } from "react-icons/fi";

const STATUS_OPTIONS = ["", "pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_BADGE   = { pending: "warning", processing: "info", shipped: "purple", delivered: "success", cancelled: "danger" };

const AdminOrdersPage = () => {
  const navigate    = useNavigate();
  const [orders,    setOrders]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [page,      setPage]      = useState(1);
  const [pagination,setPagination]= useState(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get("/orders/all", { params });
      setOrders(res.data.data.orders || []);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error("Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Order Management</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Search
          </button>
        </form>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Status"}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.user?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.items?.length}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(order.totalPrice)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{order.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {STATUS_OPTIONS.filter(Boolean).map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <FiEye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-400">No orders found</div>
          )}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;