import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">About PriceCompare</h3>
            <p className="text-xs leading-relaxed">
              Compare prices across multiple retailers in New Zealand and find the best deals on phones, laptops, cosmetics, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-orange-500 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-orange-500 transition-colors">
                  My Favorites
                </Link>
              </li>
              <li>
                <Link to="/alerts" className="hover:text-orange-500 transition-colors">
                  Price Alerts
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-orange-500 transition-colors">
                  Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Categories</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/category/phones" className="hover:text-orange-500 transition-colors">
                  Phones
                </Link>
              </li>
              <li>
                <Link to="/category/laptops" className="hover:text-orange-500 transition-colors">
                  Laptops
                </Link>
              </li>
              <li>
                <Link to="/category/cosmetics" className="hover:text-orange-500 transition-colors">
                  Cosmetics
                </Link>
              </li>
              <li>
                <Link to="/category/shoes" className="hover:text-orange-500 transition-colors">
                  Shoes
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-xs">
          <p>&copy; 2026 PriceCompare NZ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}