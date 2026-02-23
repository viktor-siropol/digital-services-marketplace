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
import Profile from "./pages/User/Profile";
import Shop from "./pages/User/shop";
import AdminRoute from "./pages/Admin/AdminRoute";
import UserList from "./pages/Admin/UserList";

const Layout = () => {
  return (
    <>
      <ToastContainer />
      <Navigation />
      <main className="py-3">
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

      <Route element={<ProtectedRoutes />}>
        <Route path="shop" element={<Shop />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/admin" element={<AdminRoute />}>
        <Route path="userlist" element={<UserList />} />
      </Route>
    </Route>,
  ),
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
