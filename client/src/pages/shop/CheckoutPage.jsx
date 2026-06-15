import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  selectCartItems, selectCartTotalPrice,
} from "../../features/cart/cartSlice.js";
import { selectUser } from "../../features/auth/authSlice.js";
import { resetCart }  from "../../features/cart/cartSlice.js";
import Button  from "../../components/ui/Button.jsx";
import Input   from "../../components/ui/Input.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import api   from "../../services/api.js";
import toast from "react-hot-toast";
import { FiPackage, FiCreditCard, FiTruck } from "react-icons/fi";

const CheckoutPage = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const user       = useSelector(selectUser);
  const cartItems  = useSelector(selectCartItems);
  const totalPrice = useSelector(selectCartTotalPrice);

  const [step,          setStep]          = useState(1);
  const [isLoading,     setIsLoading]     = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const shippingPrice = totalPrice > 100 ? 0 : 10;
  const taxPrice      = parseFloat((totalPrice * 0.08).toFixed(2));
  const orderTotal    = parseFloat((totalPrice + shippingPrice + taxPrice).toFixed(2));

  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const [shippingAddress, setShippingAddress] = useState({
    fullName:   user?.name   || "",
    phone:      user?.phone  || "",
    street:     defaultAddress?.street     || "",
    city:       defaultAddress?.city       || "",
    state:      defaultAddress?.state      || "",
    postalCode: defaultAddress?.postalCode || "",
    country:    defaultAddress?.country    || "Pakistan",
  });

  useEffect(() => {
    if (cartItems.length === 0) navigate("/cart");
  }, [cartItems, navigate]);

  const handleAddressChange = (e) => {
    setShippingAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      const response = await api.post("/orders/checkout", {
        shippingAddress,
        paymentMethod,
      });
      dispatch(resetCart());
      toast.success("Order placed successfully!");
      navigate(`/orders/${response.data.data.order._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: "Shipping",  icon: FiTruck      },
          { num: 2, label: "Payment",   icon: FiCreditCard },
          { num: 3, label: "Review",    icon: FiPackage    },
        ].map(({ num, label, icon: Icon }) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              step >= num
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-400"
            }`}>
              {num}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${
              step >= num ? "text-gray-900" : "text-gray-400"
            }`}>
              {label}
            </span>
            {num < 3 && <div className="w-8 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <FiTruck className="text-blue-600" />
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name"    name="fullName"   value={shippingAddress.fullName}   onChange={handleAddressChange} required />
                <Input label="Phone"        name="phone"      value={shippingAddress.phone}      onChange={handleAddressChange} required />
                <Input label="Street Address" name="street"   value={shippingAddress.street}     onChange={handleAddressChange} required className="sm:col-span-2" />
                <Input label="City"         name="city"       value={shippingAddress.city}       onChange={handleAddressChange} required />
                <Input label="State"        name="state"      value={shippingAddress.state}      onChange={handleAddressChange} required />
                <Input label="Postal Code"  name="postalCode" value={shippingAddress.postalCode} onChange={handleAddressChange} required />
                <Input label="Country"      name="country"    value={shippingAddress.country}    onChange={handleAddressChange} required />
              </div>
              <Button fullWidth size="lg" className="mt-6" onClick={() => setStep(2)}>
                Continue to Payment
              </Button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <FiCreditCard className="text-blue-600" />
                Payment Method
              </h2>
              <div className="space-y-3">
                {[
                  { value: "cod",    label: "Cash on Delivery",  desc: "Pay when you receive" },
                  { value: "stripe", label: "Credit/Debit Card", desc: "Secure payment via Stripe" },
                ].map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === method.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{method.label}</p>
                      <p className="text-sm text-gray-500">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" fullWidth onClick={() => setStep(1)}>Back</Button>
                <Button fullWidth onClick={() => setStep(3)}>Continue to Review</Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <FiPackage className="text-blue-600" />
                Order Review
              </h2>

              {/* Items */}
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <img
                      src={item.product?.images?.[0]?.url}
                      alt={item.product?.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Shipping Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                <p className="font-medium text-gray-700 mb-1">Shipping to:</p>
                <p className="text-gray-600">
                  {shippingAddress.fullName} — {shippingAddress.street}, {shippingAddress.city}, {shippingAddress.country}
                </p>
                <p className="font-medium text-gray-700 mt-2 mb-1">Payment:</p>
                <p className="text-gray-600 capitalize">{paymentMethod === "cod" ? "Cash on Delivery" : "Credit/Debit Card"}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setStep(2)}>Back</Button>
                <Button fullWidth size="lg" loading={isLoading} onClick={handlePlaceOrder}>
                  Place Order — {formatCurrency(orderTotal)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit sticky top-24">
          <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totalPrice)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span className={shippingPrice === 0 ? "text-green-600" : ""}>{shippingPrice === 0 ? "FREE" : formatCurrency(shippingPrice)}</span></div>
            <div className="flex justify-between"><span>Tax (8%)</span><span>{formatCurrency(taxPrice)}</span></div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;