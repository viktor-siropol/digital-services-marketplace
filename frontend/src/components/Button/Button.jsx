import { Link } from "react-router-dom";

export default function Button({
  to,
  variant = "purple",
  size = "sm",
  disabled = false,
  type = "button",
  children,
}) {
  const base = "font-medium rounded-md text-black";

  const variants = {
    purple:
      "bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-800 border-0",
    white:
      "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 mr-1",
  };

  const sizes = {
    sm: "px-1.5 py-1.5 text-xs",
  };

  const disabledStyle = disabled ? "opacity-50 cursor-not-allowed" : "";

  const className =
    `${base} ${variants[variant]} ${sizes[size]} ${disabledStyle}`.trim();

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
