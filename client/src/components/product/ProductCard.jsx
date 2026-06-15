import { Link }           from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiHeart, FiShoppingCart, FiStar } from "react-icons/fi";
import { addToCart }         from "../../features/cart/cartSlice.js";
import { addToWishlist, removeFromWishlist } from "../../features/wishlist/wishlistSlice.js";
import { selectWishlistProducts }  from "../../features/wishlist/wishlistSlice.js";
import { selectIsAuth }            from "../../features/auth/authSlice.js";
import { formatCurrency }          from "../../utils/formatCurrency.js";
import toast from "react-hot-toast";

const ProductCard = ({ product }) => {
  const dispatch          = useDispatch();
  const isAuth            = useSelector(selectIsAuth);
  const wishlistProducts  = useSelector(selectWishlistProducts);

  const isInWishlist = wishlistProducts.some(
    (p) => p._id === product._id
  );

  const mainImage = product.images?.find((img) => img.isMain)?.url
    || product.images?.[0]?.url
    || "https://via.placeholder.com/300x300?text=No+Image";

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!isAuth) {
      toast.error("Please login to add items to cart");
      return;
    }
    dispatch(addToCart({ productId: product._id, quantity: 1 }));
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isAuth) {
      toast.error("Please login to add to wishlist");
      return;
    }
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
    } else {
      dispatch(addToWishlist(product._id));
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.discountPercent > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              -{product.discountPercent}%
            </span>
          )}
          {product.isFeatured && (
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
          {!product.inStock && (
            <span className="bg-gray-800 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isInWishlist
              ? "bg-red-500 text-white"
              : "bg-white text-gray-600 opacity-0 group-hover:opacity-100 shadow-sm"
          }`}
        >
          <FiHeart size={14} fill={isInWishlist ? "currentColor" : "none"} />
        </button>

        {/* Add to Cart */}
        {product.inStock && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 left-3 right-3 bg-blue-600 text-white text-sm font-medium py-2 rounded-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <FiShoppingCart size={14} />
            Add to Cart
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.category && (
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
            {product.category.name}
          </p>
        )}

        <h3 className="font-medium text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.numReviews > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <FiStar size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-gray-700">
              {product.ratings}
            </span>
            <span className="text-xs text-gray-400">
              ({product.numReviews})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {product.comparePrice > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;