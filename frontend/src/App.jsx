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
import ProductDetails from "./pages/User/ProductDetails";
import Cart from "./pages/User/Cart";
import MyOrders from "./pages/User/MyOrders";
import OrderDetails from "./pages/User/OrderDetails";
import UserList from "./pages/Admin/UserList";
import CategoryList from "./pages/Admin/CategoryList";
import MyProducts from "./pages/Seller/MyProducts";
import ManageProduct from "./pages/Seller/ManageProduct";
import CreateProduct from "./pages/Seller/CreateProduct";
import Favorites from "./pages/User/Favorites";
import SellerOrders from "./pages/Seller/SellerOrders";
import Footer from "./components/Footer";
import SellerOrderDetails from "./pages/Seller/SellerOrderDetails";
import RouteErrorPage from "./components/RouteErrorPage";
import NotFound from "./components/NotFound";

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
        className="app-toast-container top-16!"
        toastClassName="app-toast"
      />

      <Navigation />

      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>

      <Footer />
    </>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<RouteErrorPage />}>
      <Route index element={<Shop />} />
      <Route path="shop" element={<Shop />} />
      <Route path="cart" element={<Cart />} />
      <Route path="products/:id" element={<ProductDetails />} />

      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="profile" element={<Profile />} />
        <Route path="my-orders" element={<MyOrders />} />
        <Route path="my-orders/:id" element={<OrderDetails />} />
        <Route path="favorites" element={<Favorites />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={["admin", "seller"]} />}>
        <Route path="seller/products" element={<MyProducts />} />
        <Route path="seller/products/:id" element={<ManageProduct />} />
        <Route path="seller/orders" element={<SellerOrders />} />
        <Route path="seller/orders/:id" element={<SellerOrderDetails />} />
        <Route path="seller/products/new" element={<CreateProduct />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={["admin"]} />}>
        <Route path="admin/userlist" element={<UserList />} />
        <Route path="admin/category" element={<CategoryList />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
