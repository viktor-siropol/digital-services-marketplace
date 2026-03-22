const ProductStatusBadge = ({ status }) => {
  const getClasses = () => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "processing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "ready":
        return "Ready";
      case "processing":
        return "Processing";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${getClasses()}`}
    >
      {getLabel()}
    </span>
  );
};

export default ProductStatusBadge;
