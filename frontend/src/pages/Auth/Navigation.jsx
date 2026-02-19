import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/features/auth/authSlice";
import { generateAvatarColor } from "../../utils/avatarColor";
import Button from "../../components/Button/Button";
import logo from "../../assets/logos/print_transparent.svg";

const Navigation = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-gray-100">
      <img src={logo} alt="BitMarket logo" className="h-15 mt-1" />

      <nav>
        <ul className="flex gap-6">
          {["Art", "Education", "Technology"].map((item) => (
            <li key={item}>
              <NavLink
                to={`/${item.toLowerCase()}`}
                className={({ isActive }) =>
                  `rounded-md text-sm font-medium transition
                  ${
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
        </ul>
      </nav>

      <div className="flex items-center gap-3">
        {userInfo ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={toggleDropdown}
              className="w-9 h-9 rounded-3xl cursor-pointer text-white"
              style={{
                backgroundColor: generateAvatarColor(userInfo.username),
              }}
            >
              {userInfo.username.charAt(0).toUpperCase()}
            </button>
            {isOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border border-gray-100">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Profile
                </button>
                <button
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
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
