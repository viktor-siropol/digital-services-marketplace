import { lazy, Suspense } from "react";
import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navigation from "./pages/Auth/Navigation";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Shop from "./pages/User/Shop";

import ProtectedRoutes from "./components/ProtectedRoutes";
import RoleRoute from "./components/RoleRoute";
import Footer from "./components/Footer";
import RouteErrorPage from "./components/RouteErrorPage";
import NotFound from "./components/NotFound";
import Loader from "./components/Loader";

const Profile = lazy(() => import("./pages/User/Profile"));
const ProductDetails = lazy(() => import("./pages/User/ProductDetails"));
const Cart = lazy(() => import("./pages/User/Cart"));
const MyOrders = lazy(() => import("./pages/User/MyOrders"));
const OrderDetails = lazy(() => import("./pages/User/OrderDetails"));
const Favorites = lazy(() => import("./pages/User/Favorites"));

const UserList = lazy(() => import("./pages/Admin/UserList"));
const CategoryList = lazy(() => import("./pages/Admin/CategoryList"));
const ProductReview = lazy(() => import("./pages/Admin/ProductReview"));

const MyProducts = lazy(() => import("./pages/Seller/MyProducts"));
const ManageProduct = lazy(() => import("./pages/Seller/ManageProduct"));
const CreateProduct = lazy(() => import("./pages/Seller/CreateProduct"));
const SellerOrders = lazy(() => import("./pages/Seller/SellerOrders"));
const SellerOrderDetails = lazy(
  () => import("./pages/Seller/SellerOrderDetails"),
);

const RouteLoader = () => {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
      <Loader />
    </div>
  );
};

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
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
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
        <Route path="seller/products/new" element={<CreateProduct />} />
        <Route path="seller/products/:id" element={<ManageProduct />} />
        <Route path="seller/orders" element={<SellerOrders />} />
        <Route path="seller/orders/:id" element={<SellerOrderDetails />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={["admin"]} />}>
        <Route path="admin/userlist" element={<UserList />} />
        <Route path="admin/category" element={<CategoryList />} />
        <Route path="admin/product-review" element={<ProductReview />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
