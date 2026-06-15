import { useEffect, useState }       from "react";
import { useSearchParams }           from "react-router-dom";
import { useDispatch, useSelector }  from "react-redux";
import {
  fetchProducts,
  selectProducts,
  selectProductLoading,
  selectProductPagination,
} from "../../features/product/productSlice.js";
import ProductCard from "../../components/product/ProductCard.jsx";
import Pagination  from "../../components/ui/Pagination.jsx";
import Spinner     from "../../components/ui/Spinner.jsx";
import { FiFilter, FiGrid, FiList, FiX } from "react-icons/fi";
import api from "../../services/api.js";

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest First"   },
  { value: "price-asc",      label: "Price: Low to High" },
  { value: "price-desc",     label: "Price: High to Low" },
  { value: "ratings-desc",   label: "Highest Rated"  },
  { value: "sold-desc",      label: "Best Selling"   },
];

const ProductListPage = () => {
  const dispatch    = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const products    = useSelector(selectProducts);
  const isLoading   = useSelector(selectProductLoading);
  const pagination  = useSelector(selectProductPagination);

  const [categories,    setCategories]    = useState([]);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [viewMode,      setViewMode]      = useState("grid");

  // Filter state
  const [filters, setFilters] = useState({
    search:     searchParams.get("search")     || "",
    category:   searchParams.get("category")   || "",
    minPrice:   searchParams.get("minPrice")   || "",
    maxPrice:   searchParams.get("maxPrice")   || "",
    sortBy:     searchParams.get("sortBy")     || "createdAt",
    order:      searchParams.get("order")      || "desc",
    isFeatured: searchParams.get("isFeatured") || "",
    inStock:    searchParams.get("inStock")    || "",
    page:       parseInt(searchParams.get("page") || "1"),
  });

  // Load categories
  useEffect(() => {
    api.get("/categories").then((res) => {
      setCategories(res.data.data.categories || []);
    });
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    const params = {};
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params[key] = val;
    });
    dispatch(fetchProducts(params));
    setSearchParams(params);
  }, [filters, dispatch]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSortChange = (value) => {
    const [sortBy, order] = value.split("-");
    setFilters((prev) => ({ ...prev, sortBy, order, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: "", category: "", minPrice: "", maxPrice: "",
      sortBy: "createdAt", order: "desc",
      isFeatured: "", inStock: "", page: 1,
    });
  };

  const activeFiltersCount = [
    filters.category, filters.minPrice, filters.maxPrice,
    filters.isFeatured, filters.inStock,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Sidebar Filters */}
        <aside className={`lg:w-64 flex-shrink-0 ${filterOpen ? "block" : "hidden lg:block"}`}>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <FiX size={12} />
                  Clear ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Category */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Category</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={!filters.category}
                    onChange={() => handleFilterChange("category", "")}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-600">All Categories</span>
                </label>
                {categories
                  .filter((c) => !c.parent)
                  .map((cat) => (
                    <label key={cat._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={cat._id}
                        checked={filters.category === cat._id}
                        onChange={() => handleFilterChange("category", cat._id)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-600">{cat.name}</span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Price Range</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Stock */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Availability</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock === "true"}
                  onChange={(e) => handleFilterChange("inStock", e.target.checked ? "true" : "")}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-600">In Stock Only</span>
              </label>
            </div>

            {/* Featured */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isFeatured === "true"}
                  onChange={(e) => handleFilterChange("isFeatured", e.target.checked ? "true" : "")}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-600">Featured Only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <FiFilter size={16} />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {pagination && (
                <p className="text-sm text-gray-500">
                  {pagination.totalProducts} product{pagination.totalProducts !== 1 ? "s" : ""}
                  {filters.search && ` for "${filters.search}"`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Sort */}
              <select
                value={`${filters.sortBy}-${filters.order}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* View Mode */}
              <div className="hidden sm:flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : products.length > 0 ? (
            <>
              <div className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }>
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    currentPage={filters.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiFilter size={32} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;