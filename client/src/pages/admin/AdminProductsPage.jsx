import { useEffect, useState }       from "react";
import { useNavigate }               from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/formatCurrency.js";
import Spinner    from "../../components/ui/Spinner.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Button     from "../../components/ui/Button.jsx";
import api        from "../../services/api.js";
import toast      from "react-hot-toast";
import {
  FiSearch, FiEdit2, FiTrash2,
  FiPlus, FiImage,
} from "react-icons/fi";

const AdminProductsPage = () => {
  const navigate    = useNavigate();
  const [products,  setProducts]  = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [pagination,setPagination]= useState(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const res = await api.get("/products", { params });
      setProducts(res.data.data.products || []);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted!");
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await api.put(`/products/${product._id}`, { isActive: !product.isActive });
      toast.success(`Product ${product.isActive ? "deactivated" : "activated"}`);
      fetchProducts();
    } catch {
      toast.error("Failed to update product");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-md">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Search
        </button>
      </form>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Product", "Category", "Price", "Stock", "Sold", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiImage size={16} className="text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{product.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{product.sku || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        product.stock === 0
                          ? "text-red-600"
                          : product.stock <= 10
                            ? "text-orange-500"
                            : "text-green-600"
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.sold}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                          product.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/products/${product.slug}`)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 text-gray-400">No products found</div>
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

export default AdminProductsPage;