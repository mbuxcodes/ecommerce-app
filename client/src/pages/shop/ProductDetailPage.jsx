import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProductBySlug, selectCurrentProduct,
  selectProductLoading,
} from "../../features/product/productSlice.js";
import { addToCart }      from "../../features/cart/cartSlice.js";
import { addToWishlist, removeFromWishlist,
  selectWishlistProducts } from "../../features/wishlist/wishlistSlice.js";
import { selectIsAuth }   from "../../features/auth/authSlice.js";
import Button  from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge   from "../../components/ui/Badge.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import api from "../../services/api.js";
import toast from "react-hot-toast";
import {
  FiHeart, FiShoppingCart, FiStar,
  FiMinus, FiPlus, FiChevronRight,
} from "react-icons/fi";

const ProductDetailPage = () => {
  const { slug }    = useParams();
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const product     = useSelector(selectCurrentProduct);
  const isLoading   = useSelector(selectProductLoading);
  const isAuth      = useSelector(selectIsAuth);
  const wishlist    = useSelector(selectWishlistProducts);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity,      setQuantity]      = useState(1);
  const [reviews,       setReviews]       = useState([]);
  const [reviewForm,    setReviewForm]    = useState({ rating: 5, title: "", comment: "" });
  const [submitting,    setSubmitting]    = useState(false);

  const isInWishlist = wishlist.some((p) => p._id === product?._id);

  useEffect(() => {
    dispatch(fetchProductBySlug(slug));
  }, [slug, dispatch]);

  useEffect(() => {
    if (product?._id) {
      api.get(`/reviews/${product._id}`)
        .then((res) => setReviews(res.data.data.reviews || []))
        .catch(() => {});
    }
  }, [product?._id]);

  const handleAddToCart = () => {
    if (!isAuth) { toast.error("Please login first"); return; }
    dispatch(addToCart({ productId: product._id, quantity }));
  };

  const handleWishlist = () => {
    if (!isAuth) { toast.error("Please login first"); return; }
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
    } else {
      dispatch(addToWishlist(product._id));
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuth) { toast.error("Please login to review"); return; }
    setSubmitting(true);
    try {
      await api.post(`/reviews/${product._id}`, reviewForm);
      toast.success("Review submitted!");
      setReviewForm({ rating: 5, title: "", comment: "" });
      const res = await api.get(`/reviews/${product._id}`);
      setReviews(res.data.data.reviews || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold text-gray-700">Product not found</h2>
        <Button onClick={() => navigate("/products")}>Browse Products</Button>
      </div>
    );
  }

  const mainImage = product.images?.[selectedImage]?.url
    || product.images?.[0]?.url
    || "https://via.placeholder.com/500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <span onClick={() => navigate("/")} className="hover:text-blue-600 cursor-pointer">Home</span>
        <FiChevronRight size={14} />
        <span onClick={() => navigate("/products")} className="hover:text-blue-600 cursor-pointer">Products</span>
        <FiChevronRight size={14} />
        <span className="text-gray-700 font-medium truncate">{product.name}</span>
      </div>

      {/* Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-4">
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={img._id}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    selectedImage === idx
                      ? "border-blue-600"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Badge variant="primary" className="mb-3">
              {product.category.name}
            </Badge>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

          {/* Rating */}
          {product.numReviews > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((star) => (
                  <FiStar
                    key={star}
                    size={16}
                    className={star <= Math.round(product.ratings)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-200 fill-gray-200"
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">{product.ratings}</span>
              <span className="text-sm text-gray-400">({product.numReviews} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {product.comparePrice > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {formatCurrency(product.comparePrice)}
                </span>
                <Badge variant="danger">
                  -{product.discountPercent}%
                </Badge>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-6">
            {product.shortDescription || product.description}
          </p>

          {/* Stock Status */}
          <div className="mb-6">
            {product.inStock ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-600 font-medium">
                  In Stock ({product.stock} available)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-red-600 font-medium">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Quantity */}
          {product.inStock && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <FiMinus size={14} />
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <FiPlus size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              fullWidth
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="flex-1"
            >
              <FiShoppingCart size={18} />
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
            <button
              onClick={handleWishlist}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                isInWishlist
                  ? "border-red-500 bg-red-50 text-red-500"
                  : "border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-400"
              }`}
            >
              <FiHeart size={20} fill={isInWishlist ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t border-gray-200 pt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-8">
          Customer Reviews ({reviews.length})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-gray-400">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {review.user?.name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{review.user?.name}</p>
                        {review.isVerifiedPurchase && (
                          <span className="text-xs text-green-600">✓ Verified Purchase</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((star) => (
                        <FiStar
                          key={star}
                          size={12}
                          className={star <= review.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200"
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{review.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Write Review Form */}
          {isAuth && (
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star Rating */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm((p) => ({ ...p, rating: star }))}
                        className="text-2xl"
                      >
                        <FiStar
                          className={star <= reviewForm.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Title</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Brief summary of your review"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Comment</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                    placeholder="Share your experience with this product..."
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <Button type="submit" loading={submitting} fullWidth>
                  Submit Review
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;