import { Link } from "react-router-dom";
import { useGetMyProductsQuery } from "../../redux/api/productApiSlice";
import ProductStatusBadge from "../../components/ProductStatusBadge";
import Loader from "../../components/Loader";
import Message from "../../components/Message";

const MyProducts = () => {
  const { data: products = [], isLoading, error } = useGetMyProductsQuery();

  if (isLoading) {
    return (
      <div className="p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message || error?.error || "Failed to load products"}
        </Message>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your products and monitor image processing status.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-sm text-gray-600">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product._id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.slug}</p>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <ProductStatusBadge status={product.status} />
                </td>

                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(product.createdAt).toLocaleString()}
                </td>

                <td className="px-4 py-3">
                  <Link
                    to={`/seller/products/${product._id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="p-6 text-sm text-gray-500">
            You do not have any products yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProducts;
