import { useState, useRef, useEffect, useMemo } from "react";
import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiGrid,
  FiHeart,
  FiLogOut,
  FiPackage,
  FiPlusSquare,
  FiShoppingCart,
  FiTag,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { logout } from "../../redux/features/auth/authSlice";
import { apiSlice } from "../../redux/api/apiSlice";
import { generateAvatarColor } from "../../utils/avatarColor";
import logo from "../../assets/images/logo.svg";

const getUserRoleLabel = (userInfo) => {
  if (!userInfo) return "";

  if (userInfo.isAdmin) return "Admin";
  if (userInfo.isSeller) return "Seller";

  return "Customer";
};

const Navigation = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { userInfo } = useSelector((state) => state.auth);
  const { cartItems = [] } = useSelector((state) => state.cart);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [cartItems]);

  const formattedCartCount = cartItemsCount > 99 ? "99+" : cartItemsCount;

  const primaryNavItems = useMemo(() => {
    const items = [
      {
        label: "Browse",
        to: "/shop",
        icon: FiGrid,
      },
    ];

    if (userInfo) {
      items.push({
        label: "Orders",
        to: "/my-orders",
        icon: FiPackage,
      });
    }

    if (userInfo?.isSeller || userInfo?.isAdmin) {
      items.push(
        {
          label: "Sales",
          to: "/seller/orders",
          icon: FiTruck,
        },
        {
          label: "My Products",
          to: "/seller/products",
          icon: FiTag,
        },
      );
    }

    return items;
  }, [userInfo]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      dispatch(logout());
      dispatch(apiSlice.util.resetApiState());
      setIsOpen(false);
      setIsLoggingOut(false);
      navigate("/login");
    }
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMenuNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-1680px items-center justify-between gap-6 px-4 md:px-6">
        <div className="flex shrink-0 items-center">
          <Link to="/" className="inline-flex items-center">
            <img src={logo} alt="BitMarket" className="h-18 w-auto" />
          </Link>
        </div>

        <nav className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <ul className="flex items-center gap-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {userInfo ? (
            <NavLink
              to="/favorites"
              className={({ isActive }) =>
                `inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
              aria-label="Favorites"
              title="Favorites"
            >
              <FiHeart className="h-5 w-5" />
            </NavLink>
          ) : (
            <Link
              to="/login?redirect=/favorites"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
              aria-label="Favorites"
              title="Favorites"
            >
              <FiHeart className="h-5 w-5" />
            </Link>
          )}

          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `relative inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
            aria-label="Cart"
            title="Cart"
          >
            <FiShoppingCart className="h-5 w-5" />
            {cartItemsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[11px] font-semibold text-white">
                {formattedCartCount}
              </span>
            )}
          </NavLink>

          {userInfo ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={toggleDropdown}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
                style={{
                  backgroundColor: generateAvatarColor(userInfo.username),
                }}
                aria-label="Open account menu"
              >
                {userInfo.username.charAt(0).toUpperCase()}
              </button>

              {isOpen && (
                <div className="absolute right-0 z-60 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)]">
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {userInfo.username}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {getUserRoleLabel(userInfo)}
                    </p>
                  </div>

                  <div className="p-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleMenuNavigate("/profile")}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <FiUser className="h-4 w-4" />
                        <span>Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMenuNavigate("/my-orders")}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <FiPackage className="h-4 w-4" />
                        <span>My orders</span>
                      </button>
                    </div>

                    {(userInfo.isAdmin || userInfo.isSeller) && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Seller tools
                        </p>

                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleMenuNavigate("/seller/orders")}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <FiTruck className="h-4 w-4" />
                            <span>Sales orders</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleMenuNavigate("/seller/products")
                            }
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <FiTag className="h-4 w-4" />
                            <span>My products</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleMenuNavigate("/seller/products/new")
                            }
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <FiPlusSquare className="h-4 w-4" />
                            <span>Create product</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {userInfo.isAdmin && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Admin
                        </p>

                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleMenuNavigate("/admin/userlist")
                            }
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <FiUsers className="h-4 w-4" />
                            <span>Users</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleMenuNavigate("/admin/category")
                            }
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <FiTag className="h-4 w-4" />
                            <span>Categories</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiLogOut className="h-4 w-4" />
                        <span>
                          {isLoggingOut ? "Logging out..." : "Log out"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign up
              </Link>

              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Log in
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;
