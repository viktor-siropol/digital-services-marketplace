import { useState, useRef, useEffect, useMemo } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiShoppingCart } from "react-icons/fi";
import { logout } from "../../redux/features/auth/authSlice";
import { generateAvatarColor } from "../../utils/avatarColor";
import Button from "../../components/Button/Button";
import logo from "../../assets/images/logo.svg";

const Navigation = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);
  const { cartItems = [] } = useSelector((state) => state.cart);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [cartItems]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="relative z-50 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur">
      <Link to="/" className="inline-block">
        <img src={logo} alt="BitMarket" className="h-18 w-auto" />
      </Link>

      <nav>
        <ul className="flex items-center gap-6">
          {["Art", "Education", "Technology"].map((item) => (
            <li key={item}>
              <NavLink
                to={`/${item.toLowerCase()}`}
                className={({ isActive }) =>
                  `rounded-md px-2 py-1 text-sm font-medium transition ${
                    isActive
                      ? "bg-gray-100 text-black"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`
                }
              >
                {item}
              </NavLink>
            </li>
          ))}

          {userInfo && (
            <li>
              <NavLink
                to="/my-orders"
                className={({ isActive }) =>
                  `rounded-md px-2 py-1 text-sm font-medium transition ${
                    isActive
                      ? "bg-gray-100 text-black"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`
                }
              >
                My Orders
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="flex items-center gap-3">
        <Link
          to="/cart"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-50"
          aria-label="Cart"
        >
          <FiShoppingCart className="h-5 w-5" />
          {cartItemsCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[11px] font-semibold text-white">
              {cartItemsCount}
            </span>
          )}
        </Link>

        {userInfo ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={toggleDropdown}
              className="h-9 w-9 cursor-pointer rounded-3xl text-white"
              style={{
                backgroundColor: generateAvatarColor(userInfo.username),
              }}
            >
              {userInfo.username.charAt(0).toUpperCase()}
            </button>

            {isOpen && (
              <div className="absolute right-0 z-60 mt-2 w-44 rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setIsOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Profile
                </button>

                <button
                  onClick={() => {
                    navigate("/my-orders");
                    setIsOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  My Orders
                </button>

                {(userInfo.isAdmin || userInfo.isSeller) && (
                  <div>
                    <button
                      onClick={() => {
                        navigate("/seller/products");
                        setIsOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      MyProducts
                    </button>
                    <button
                      onClick={() => {
                        navigate("/seller/products/new");
                        setIsOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Create Product
                    </button>
                  </div>
                )}

                {userInfo.isAdmin && (
                  <div>
                    <button
                      onClick={() => {
                        navigate("/admin/userlist");
                        setIsOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Users
                    </button>
                    <button
                      onClick={() => {
                        navigate("/admin/category");
                        setIsOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Category
                    </button>
                  </div>
                )}

                <button
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Button variant="white" to="/register">
              Sign up
            </Button>
            <Button to="/login">Log in</Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Navigation;
