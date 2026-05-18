import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import {
  useGetMyProductByIdQuery,
  useUpdateProductMutation,
} from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

const statusStyles = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processing: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

const formatFileSize = (size) => `${(size / 1024 / 1024).toFixed(2)} MB`;

const ManageProduct = () => {
  const { id } = useParams();

  const {
    data: product,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetMyProductByIdQuery(id, {
    refetchOnMountOrArgChange: true,
  });

  const {
    data: categories = [],
    isLoading: loadingCategories,
    error: categoriesError,
  } = useGetCategoriesQuery();

  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [countInStock, setCountInStock] = useState("");
  const [description, setDescription] = useState("");

  const [existingImages, setExistingImages] = useState([]);
  const [existingImagesDirty, setExistingImagesDirty] = useState(false);
  const [newImages, setNewImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const initializedProductIdRef = useRef(null);
  const newImagesRef = useRef([]);

  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!product) return;

    if (initializedProductIdRef.current !== product._id) {
      setName(product.name || "");
      setBrand(product.brand || "");
      setCategory(product.category?._id || product.category || "");
      setPrice(product.price || "");
      setQuantity(product.quantity || "");
      setCountInStock(product.countInStock || "");
      setDescription(product.description || "");
      setExistingImages(product.images || []);
      setExistingImagesDirty(false);
      setNewImages([]);
      setPreviewImage(null);
      initializedProductIdRef.current = product._id;
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    if (existingImagesDirty) return;

    setExistingImages(product.images || []);
  }, [product?.images, product?.status, existingImagesDirty, product]);

  useEffect(() => {
    if (product?.status !== "processing") return;

    const interval = setInterval(() => {
      refetch();
    }, 2500);

    return () => clearInterval(interval);
  }, [product?.status, refetch]);

  const handleNewImagesChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (!selectedFiles.length) {
      return;
    }

    const mappedFiles = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNewImages((prev) => [...prev, ...mappedFiles]);
    e.target.value = "";
  };

  const removeExistingImage = (imageId) => {
    setExistingImagesDirty(true);
    setExistingImages((prev) => prev.filter((img) => img.imageId !== imageId));
  };

  const removeNewImage = (id) => {
    setNewImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);

      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return prev.filter((img) => img.id !== id);
    });
  };

  const originalImageIds = useMemo(
    () =>
      (product?.images || [])
        .map((img) => img.imageId)
        .sort()
        .join("|"),
    [product],
  );

  const currentImageIds = useMemo(
    () =>
      existingImages
        .map((img) => img.imageId)
        .sort()
        .join("|"),
    [existingImages],
  );

  const imagesChanged =
    originalImageIds !== currentImageIds || newImages.length > 0;

  const hasChanges =
    name !== (product?.name || "") ||
    brand !== (product?.brand || "") ||
    category !== (product?.category?._id || product?.category || "") ||
    String(price) !== String(product?.price || "") ||
    String(quantity) !== String(product?.quantity || "") ||
    String(countInStock) !== String(product?.countInStock || "") ||
    description !== (product?.description || "") ||
    imagesChanged;

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    const formData = new FormData();

    formData.append("name", name.trim());
    formData.append("brand", brand.trim());
    formData.append("category", category);
    formData.append("price", price);
    formData.append("quantity", quantity);
    formData.append("countInStock", countInStock);
    formData.append("description", description.trim());
    formData.append(
      "retainedImageIds",
      JSON.stringify(existingImages.map((img) => img.imageId)),
    );

    for (const image of newImages) {
      formData.append("images", image.file);
    }

    try {
      const updatedProduct = await updateProduct({ id, formData }).unwrap();

      toast.success("Product updated successfully");

      setName(updatedProduct.name || "");
      setBrand(updatedProduct.brand || "");
      setCategory(
        updatedProduct.category?._id || updatedProduct.category || "",
      );
      setPrice(updatedProduct.price || "");
      setQuantity(updatedProduct.quantity || "");
      setCountInStock(updatedProduct.countInStock || "");
      setDescription(updatedProduct.description || "");
      setExistingImages(updatedProduct.images || []);
      setExistingImagesDirty(false);

      newImages.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      setNewImages([]);
      setPreviewImage(null);
    } catch (updateError) {
      toast.error(updateError?.data?.message || "Updating product failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error || categoriesError) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-205 px-4 py-4 md:px-6">
          <Message variant="danger">
            {error?.data?.message ||
              categoriesError?.data?.message ||
              error?.error ||
              categoriesError?.error ||
              "Failed to load product data"}
          </Message>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-205 px-4 py-4 md:px-6">
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Seller workspace
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight text-slate-900">
                Edit product
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Update the core product information and adjust the image set for
                this listing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {product?.status === "processing" && (
                <span className="text-xs font-medium text-slate-500">
                  {isFetching ? "Syncing..." : "Auto-refresh on"}
                </span>
              )}

              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                  statusStyles[product?.status] || statusStyles.processing
                }`}
              >
                {product?.status || "processing"}
              </span>
            </div>
          </div>
        </div>

        <form
          onSubmit={submitHandler}
          className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Product details
            </h2>
            <p className="text-sm text-slate-500">
              Edit the fields below to keep this listing accurate and ready for
              customers.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Product name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Brand
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Enter brand"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>

              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loadingCategories}
                  className="h-12 w-full appearance-none rounded-full border border-slate-200 bg-white px-5 pr-11 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select category"}
                  </option>
                  {categories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Price
                </label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Count in stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={countInStock}
                  onChange={(e) => setCountInStock(e.target.value)}
                  placeholder="Enter stock count"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Product images
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Review current images and add new files when needed.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                    {existingImages.length} current
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                    {newImages.length} new
                  </span>
                </div>
              </div>

              {existingImages.length > 0 ? (
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {existingImages.map((image) => (
                    <div
                      key={image.imageId}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            src:
                              image.medium || image.original || image.thumbnail,
                            name: image.alt || image.imageId,
                            blurDataURL: image.blurDataURL,
                          })
                        }
                        className="block w-full text-left"
                      >
                        <ProductImagePreview
                          src={
                            image.thumbnail || image.medium || image.original
                          }
                          blurDataURL={image.blurDataURL}
                          alt={image.alt || image.imageId}
                          wrapperClassName="aspect-square w-full bg-slate-50"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.imageId)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-xs font-medium text-rose-600 shadow hover:bg-white"
                        aria-label="Remove current image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-sm text-slate-500">
                  {product?.status === "processing"
                    ? "Images are still processing. This section refreshes automatically."
                    : "No current images."}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-2.5">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleNewImagesChange}
                  className="block w-full text-sm text-slate-700"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                PNG, JPG or WEBP. You can add files in multiple steps.
              </p>

              {newImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {newImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            src: image.previewUrl,
                            name: image.file.name,
                            blurDataURL: image.previewUrl,
                          })
                        }
                        className="block w-full text-left"
                      >
                        <ProductImagePreview
                          src={image.previewUrl}
                          blurDataURL={image.previewUrl}
                          alt={image.file.name}
                          wrapperClassName="aspect-square w-full bg-slate-50"
                          className="h-full w-full object-cover"
                        />

                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-slate-900">
                            {image.file.name}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatFileSize(image.file.size)}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeNewImage(image.id)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-xs font-medium text-rose-600 shadow hover:bg-white"
                        aria-label="Remove new image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {product?.status === "failed" && product?.processingError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm text-rose-700">
                  {product.processingError}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-1">
              <div>{updating ? <Loader size="sm" /> : null}</div>

              <button
                type="submit"
                disabled={updating || loadingCategories || !hasChanges}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating ? "Updating..." : "Update product"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-slate-700 shadow hover:bg-white"
              aria-label="Close preview"
            >
              ×
            </button>

            <img
              src={previewImage.src}
              alt={previewImage.name}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProduct;
