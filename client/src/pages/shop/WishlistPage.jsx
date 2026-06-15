import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchWishlist, removeFromWishlist,
  selectWishlistProducts, selectWishlistLoading,
} from "../../features/wishlist/wishlistSlice.js";
import { addToCart } from "../../features/cart/cartSlice.js";
import { selectIsAuth } from "../../features/auth/authSlice.js";
import ProductCard from "../../components/product/ProductCard.jsx";
import Button      from "../../components/ui/Button.jsx";
import Spinner     from "../../components/ui/Spinner.jsx";
import { FiHeart  } from "react-icons/fi";

const WishlistPage = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const isAuth    = useSelector(selectIsAuth);
  const products  = useSelector(selectWishlistProducts);
  const isLoading = useSelector(selectWishlistLoading);

  useEffect(() => {
    if (isAuth) dispatch(fetchWishlist());
  }, [isAuth, dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiHeart size={64} className="text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-700">Your wishlist is empty</h2>
        <p className="text-gray-400">Save products you love for later</p>
        <Button onClick={() => navigate("/products")}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          My Wishlist
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({products.length} item{products.length !== 1 ? "s" : ""})
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;