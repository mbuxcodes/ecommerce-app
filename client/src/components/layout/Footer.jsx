import { Link } from "react-router-dom";
import { FiGithub, FiTwitter, FiInstagram } from "react-icons/fi";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-bold text-xl text-white">EStore</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your one-stop shop for everything you need.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FiGithub size={18} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FiTwitter size={18} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FiInstagram size={18} /></a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-white mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              {[
                { to: "/products",           label: "All Products" },
                { to: "/products?isFeatured=true", label: "Featured" },
                { to: "/products?inStock=true",    label: "In Stock" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-2 text-sm">
              {[
                { to: "/login",    label: "Login"    },
                { to: "/register", label: "Register" },
                { to: "/orders",   label: "My Orders" },
                { to: "/wishlist", label: "Wishlist"  },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>📧 support@estore.com</li>
              <li>📞 +1 (800) 123-4567</li>
              <li>🕐 Mon-Fri 9AM - 6PM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} EStore. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/320px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" className="h-6 opacity-60" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;