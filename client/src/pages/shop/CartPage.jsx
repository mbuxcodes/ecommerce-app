import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCart, updateCartItem,
  removeFromCart, clearCart,
  selectCartItems, selectCartTotalItems,
  selectCartTotalPrice, selectCartLoading,
} from "../../features/cart/cartSlice.js";
import { selectIsAuth } from "../../features/auth/authSlice.js";
import Button  from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import {
  FiTrash2, FiMinus, FiPlus,
  FiShoppingBag, FiArrowRight,
} from "react-icons/fi";

const CartPage = () => {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const isAuth      = useSelector(selectIsAuth);
  const items       = useSelector(selectCartItems);
  const totalItems  = useSelector(selectCartTotalItems);
  const totalPrice  = useSelector(selectCartTotalPrice);
  const isLoading   = useSelector(selectCartLoading);

  useEffect(() => {
    if (isAuth) dispatch(fetchCart());
  }, [isAuth, dispatch]);

  const handleQuantityChange = (itemId, newQty) => {
    if (newQty < 1) return;
    dispatch(updateCartItem({ itemId, quantity: newQty }));
  };

  const handleRemove = (itemId) => {
    dispatch(removeFromCart(itemId));
  };

  const handleClear = () => {
    dispatch(clearCart());
  };

  if (!isAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiShoppingBag size={64} className="text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-700">Please login to view your cart</h2>
        <Button onClick={() => navigate("/login")}>Login</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiShoppingBag size={64} className="text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-700">Your cart is empty</h2>
        <p className="text-gray-400">Add some products to get started</p>
        <Button onClick={() => navigate("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  const shippingPrice = totalPrice > 100 ? 0 : 10;
  const taxPrice      = parseFloat((totalPrice * 0.08).toFixed(2));
  const orderTotal    = parseFloat((totalPrice + shippingPrice + taxPrice).toFixed(2));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Shopping Cart
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({totalItems} item{totalItems !== 1 ? "s" : ""})
          </span>
        </h1>
        <button
          onClick={handleClear}
          className="text-sm text-red-500 hover:underline flex items-center gap-1"
        >
          <FiTrash2 size={14} />
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product  = item.product;
            const mainImage = product?.images?.find((img) => img.isMain)?.url
              || product?.images?.[0]?.url
              || "https://via.placeholder.com/100";

            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4"
              >
                {/* Image */}
                <Link to={`/products/${product?.slug}`}>
                  <img
                    src={mainImage}
                    alt={product?.name}
                    className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${product?.slug}`}
                    className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2 text-sm"
                  >
                    {product?.name}
                  </Link>
                  <p className="text-blue-600 font-semibold mt-1">
                    {formatCurrency(item.price)}
                  </p>

                  {/* Stock Warning */}
                  {product?.stock <= 5 && product?.stock > 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      Only {product.stock} left!
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isLoading}
                        className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        <FiMinus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                        disabled={item.quantity >= product?.stock || isLoading}
                        className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        <FiPlus size={12} />
                      </button>
                    </div>

                    {/* Subtotal + Remove */}
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemove(item._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} items)</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shippingPrice === 0 ? "text-green-600 font-medium" : ""}>
                  {shippingPrice === 0 ? "FREE" : formatCurrency(shippingPrice)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>{formatCurrency(taxPrice)}</span>
              </div>
              {shippingPrice === 0 && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg p-2">
                  🎉 You qualify for free shipping!
                </p>
              )}
              {shippingPrice > 0 && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2">
                  Add {formatCurrency(100 - totalPrice)} more for free shipping
                </p>
              )}
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4">
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-lg">{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              className="mt-5"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
              <FiArrowRight size={16} />
            </Button>

            <Link
              to="/products"
              className="block text-center text-sm text-gray-500 hover:text-blue-600 mt-3 transition-colors"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;