import { toast } from "react-toastify";
import ProductStatusBadge from "./ProductStatusBadge";
import { useRetryProductImageProcessingMutation } from "../redux/api/productApiSlice";

const ProductProcessingPanel = ({ product }) => {
  const [retryProcessing, { isLoading: retrying }] =
    useRetryProductImageProcessingMutation();

  const retryHandler = async () => {
    try {
      const res = await retryProcessing(product._id).unwrap();
      toast.success(res?.message || "Retry started");
    } catch (error) {
      toast.error(error?.data?.message || error?.error || "Retry failed");
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Processing status
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Current image processing state for this product.
          </p>
        </div>

        <ProductStatusBadge status={product.status} />
      </div>

      {product.status === "processing" && (
        <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          Images are currently being processed. This page will refresh
          automatically while processing is in progress.
        </div>
      )}

      {product.status === "failed" && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Image processing failed.</p>
            {product.processingError ? (
              <p className="mt-1 wrap-break-word">{product.processingError}</p>
            ) : (
              <p className="mt-1">Unknown processing error.</p>
            )}
          </div>

          <button
            type="button"
            onClick={retryHandler}
            disabled={retrying}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? "Retrying..." : "Retry image processing"}
          </button>
        </div>
      )}

      {product.status === "ready" && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Images are ready and the product is available for normal use.
        </div>
      )}
    </div>
  );
};

export default ProductProcessingPanel;
