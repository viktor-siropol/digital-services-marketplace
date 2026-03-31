import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import Navigation from "./pages/Auth/Navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ProtectedRoutes from "./components/ProtectedRoutes";
import RoleRoute from "./components/RoleRoute";
import Profile from "./pages/User/Profile";
import Shop from "./pages/User/Shop";
import UserList from "./pages/Admin/UserList";
import CategoryList from "./pages/Admin/CategoryList";
import MyProducts from "./pages/Seller/MyProducts";
import ManageProduct from "./pages/Seller/ManageProduct";
import CreateProduct from "./pages/Seller/CreateProduct";

const Layout = () => {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2800}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        style={{
          top: "76px",
          right: "16px",
          zIndex: 40,
        }}
        toastStyle={{
          borderRadius: "18px",
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid rgba(226,232,240,0.95)",
          boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
          backdropFilter: "none",
        }}
      />
      <Navigation />
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="shop" element={<Shop />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={["admin", "seller"]} />}>
        <Route path="seller/products" element={<MyProducts />} />
        <Route path="seller/products/new" element={<CreateProduct />} />
        <Route path="seller/products/:id" element={<ManageProduct />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={["admin"]} />}>
        <Route path="admin/userlist" element={<UserList />} />
        <Route path="admin/category" element={<CategoryList />} />
      </Route>
    </Route>,
  ),
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
