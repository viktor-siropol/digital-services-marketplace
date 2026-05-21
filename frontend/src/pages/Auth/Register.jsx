import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { setCredentials } from "../../redux/features/auth/authSlice";
import { useRegisterMutation } from "../../redux/api/userApiSlice";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";

const accountTypes = [
  {
    value: "customer",
    title: "Customer",
    eyebrow: "I want to buy",
    description:
      "Browse services, save favorites, place orders, and track purchases.",
  },
  {
    value: "seller",
    title: "Seller",
    eyebrow: "I want to sell",
    description:
      "Create products, manage your offers, and view incoming sales.",
  },
];

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [register, { isLoading }] = useRegisterMutation();

  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get("redirect") || "/";

  const [accountType, setAccountType] = useState("customer");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [userInfo, navigate, redirect]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!password) {
      toast.error("Password is required");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        isSeller: accountType === "seller",
      }).unwrap();

      dispatch(setCredentials({ ...res }));
      navigate(redirect);
      toast.success(
        accountType === "seller"
          ? "Seller account created successfully"
          : "Account created successfully",
      );
    } catch (err) {
      toast.error(err?.data?.message || err.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
              Create account
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Join BitMarket
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Choose how you want to use the marketplace. You can create a buyer
              account or start selling your own digital services.
            </p>
          </div>

          <form onSubmit={submitHandler} className="mt-6 space-y-5">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Choose account type
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {accountTypes.map((type) => {
                  const isSelected = accountType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAccountType(type.value)}
                      className={`rounded-3xl border p-5 text-left transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium uppercase tracking-[0.2em] ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {type.eyebrow}
                      </p>

                      <h2 className="mt-2 text-lg font-semibold">
                        {type.title}
                      </h2>

                      <p
                        className={`mt-2 text-sm leading-6 ${
                          isSelected ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <input
                type="text"
                id="username"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                type="email"
                id="email"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                type="password"
                id="password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <input
                type="password"
                id="confirmPassword"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading
                  ? "Creating account..."
                  : accountType === "seller"
                    ? "Create seller account"
                    : "Create customer account"}
              </button>

              {isLoading ? <Loader size="sm" /> : null}
            </div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to={redirect ? `/login?redirect=${redirect}` : "/login"}
                className="font-medium text-slate-900 underline-offset-4 transition hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Register;
