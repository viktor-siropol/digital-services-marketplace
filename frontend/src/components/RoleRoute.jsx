import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const RoleRoute = ({ allowedRoles = [] }) => {
  const { userInfo } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!userInfo) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }

  const userRoles = [];

  if (userInfo.isAdmin) userRoles.push("admin");
  if (userInfo.isSeller) userRoles.push("seller");

  const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
