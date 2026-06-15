import { useEffect }        from "react";
import { Link }             from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchFeaturedProducts, selectFeaturedProducts, selectProductLoading } from "../../features/product/productSlice.js";
import ProductCard  from "../../components/product/ProductCard.jsx";
import Spinner      from "../../components/ui/Spinner.jsx";
import {
  FiShield, FiTruck, FiRefreshCw, FiHeadphones,
} from "react-icons/fi";

const features = [
  { icon: FiShield,     title: "Secure Payment",   desc: "100% secure transactions"    },
  { icon: FiTruck,      title: "Free Shipping",     desc: "On orders over $100"         },
  { icon: FiRefreshCw,  title: "Easy Returns",      desc: "30-day return policy"        },
  { icon: FiHeadphones, title: "24/7 Support",      desc: "Always here to help"         },
];

const HomePage = () => {
  const dispatch  = useDispatch();
  const products  = useSelector(selectFeaturedProducts);
  const isLoading = useSelector(selectProductLoading);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
  }, [dispatch]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              🛍️ New Season Sale — Up to 40% Off
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Shop the Latest
              <span className="block text-blue-200">Trends Online</span>
            </h1>
            <p className="text-lg text-blue-100 mb-8 leading-relaxed">
              Discover thousands of products at unbeatable prices. Quality guaranteed, fast delivery, and easy returns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/products"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                to="/products?isFeatured=true"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-white/50 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Featured Items
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-gray-500 text-sm mt-1">
              Hand-picked products just for you
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p>No featured products available</p>
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Shopping?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Join thousands of happy customers and discover amazing deals every day.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;