import { useMemo } from "react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import ProductImagePreview from "../../components/ProductImagePreview";
import {
  clearCart,
  removeFromCart,
  updateCartItemQty,
} from "../../redux/features/cart/cartSlice";
import { useCreateOrderMutation } from "../../redux/api/orderApiSlice";

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.auth);

  const [createOrder, { isLoading: creatingOrder }] = useCreateOrderMutation();

  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    );
  }, [cartItems]);

  const decreaseQty = (item) => {
    dispatch(
      updateCartItemQty({
        productId: item.product,
        qty: Math.max(1, Number(item.qty) - 1),
      }),
    );
  };

  const increaseQty = (item) => {
    dispatch(
      updateCartItemQty({
        productId: item.product,
        qty: Math.min(Number(item.countInStock || 1), Number(item.qty) + 1),
      }),
    );
  };

  const handleQtyInputChange = (item, value) => {
    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
      dispatch(
        updateCartItemQty({
          productId: item.product,
          qty: 1,
        }),
      );
      return;
    }

    dispatch(
      updateCartItemQty({
        productId: item.product,
        qty: parsedValue,
      }),
    );
  };

  const placeOrderHandler = async () => {
    if (!cartItems.length) {
      return;
    }

    try {
      const createdOrder = await createOrder({
        orderItems: cartItems,
      }).unwrap();

      dispatch(clearCart());
      toast.success("Order placed successfully");
      navigate(`/my-orders/${createdOrder._id}`);
    } catch (error) {
      toast.error(
        error?.data?.message || error?.error || "Failed to place order",
      );
    }
  };

  if (!cartItems.length) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">
              Your cart is empty
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Add a few products and come back here to review them.
            </p>

            <Link
              to="/shop"
              className="mt-6 inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Cart</h1>
            <p className="mt-1 text-sm text-slate-500">
              {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
            </p>
          </div>

          <button
            type="button"
            onClick={() => dispatch(clearCart())}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear cart
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-4">
            {cartItems.map((item) => (
              <article
                key={item.product}
                className="rounded-3xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    to={`/products/${item.product}`}
                    className="block h-28 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:w-32"
                  >
                    {item.image ? (
                      <ProductImagePreview
                        src={item.image}
                        alt={item.name}
                        wrapperClassName="h-full w-full bg-slate-100"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link to={`/products/${item.product}`}>
                          <h2 className="text-lg font-semibold text-slate-900 transition hover:text-slate-700">
                            {item.name}
                          </h2>
                        </Link>

                        <p className="mt-1 text-sm text-slate-500">
                          Stock available: {item.countInStock}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatPrice(item.price)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPrice(Number(item.price) * Number(item.qty))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => decreaseQty(item)}
                          disabled={item.qty <= 1}
                          className="flex h-10 w-10 items-center justify-center text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={item.countInStock || 1}
                          value={item.qty}
                          onChange={(e) =>
                            handleQtyInputChange(item, e.target.value)
                          }
                          className="h-10 w-16 border-x border-slate-200 bg-white text-center text-sm font-medium text-slate-900 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => increaseQty(item)}
                          disabled={item.qty >= item.countInStock}
                          className="flex h-10 w-10 items-center justify-center text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => dispatch(removeFromCart(item.product))}
                        className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Cart summary
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Items</span>
                  <span className="font-medium text-slate-900">
                    {totalItems}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                  <span className="text-base font-semibold text-slate-900">
                    Subtotal
                  </span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Orders are validated again on the backend before they are
                    created.
                  </p>
                </div>
              </div>

              {userInfo ? (
                <button
                  type="button"
                  onClick={placeOrderHandler}
                  disabled={creatingOrder}
                  className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingOrder ? "Placing order..." : "Place order"}
                </button>
              ) : (
                <Link
                  to="/login?redirect=/cart"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Sign in to place order
                </Link>
              )}

              <Link
                to="/shop"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Cart;
