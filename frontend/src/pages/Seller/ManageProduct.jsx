import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useGetMyProductByIdQuery,
  useUpdateProductMutation,
} from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import { toast } from "react-toastify";
import { IoClose } from "react-icons/io5";

const statusStyles = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const overlayIconStyle = {
  stroke: "rgba(0,0,0,0.95)",
  strokeWidth: 18,
  filter:
    "drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.85))",
};

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

    formData.append("name", name);
    formData.append("brand", brand);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("quantity", quantity);
    formData.append("countInStock", countInStock);
    formData.append("description", description);
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
    } catch (error) {
      toast.error(error?.data?.message || "Updating product failed");
    }
  };

  if (isLoading || loadingCategories) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error || categoriesError) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message ||
            categoriesError?.data?.message ||
            error?.error ||
            categoriesError?.error ||
            "Failed to load product data"}
        </Message>
      </div>
    );
  }

  return (
    <div className="relative z-0 min-h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-20 top-12 h-56 w-56 rounded-full bg-violet-200/30" />
        <div className="absolute -right-24 top-28 h-52 w-52 rounded-full bg-slate-200/40" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-100/30" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-medium text-violet-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Seller workspace
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Edit Product
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Edit product details, manage current images, and upload new ones.
            </p>
          </div>

          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
              statusStyles[product?.status] || statusStyles.processing
            }`}
          >
            {product?.status || "processing"}
          </div>
        </div>

        <form
          className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur"
          onSubmit={submitHandler}
        >
          <div className="border-b border-slate-100 bg-linear-to-r from-violet-50 via-fuchsia-50 to-cyan-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Product editor
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {product?.status === "processing"
                    ? "Images are being refreshed automatically while processing runs."
                    : "Changes are saved to the product and image set together."}
                </p>
              </div>

              {product?.status === "processing" && (
                <span className="text-xs font-medium text-amber-700">
                  {isFetching ? "Syncing..." : "Auto-refresh on"}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Product name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="rounded-2xl border border-violet-100 bg-linear-to-br from-violet-50/80 to-cyan-50/80 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Current images
                </label>

                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-violet-700 shadow-sm">
                  {existingImages.length} current
                </span>
              </div>

              {existingImages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-3 py-6 text-center text-sm text-slate-500">
                  {product?.status === "processing"
                    ? "Images are still processing. This section refreshes automatically."
                    : "No current images."}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
                          className="h-24 w-full object-cover"
                          wrapperClassName="h-24 w-full"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.imageId)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-medium text-rose-600 shadow hover:bg-white"
                        aria-label="Remove current image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Add new images
                </label>

                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                  {newImages.length} new
                </span>
              </div>

              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                onChange={handleNewImagesChange}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />

              <p className="mt-2 text-xs text-slate-500">
                Update product details, pricing, stock and media.
              </p>

              {newImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
                            {(image.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeNewImage(image.id)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-medium text-rose-600 shadow hover:bg-white"
                        aria-label="Remove new image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={updating || !hasChanges}
                className="inline-flex items-center rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(99,102,241,0.28)] transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="absolute right-4 top-4 z-10 p-1 transition hover:scale-105"
              aria-label="Close preview"
            >
              <IoClose
                className="text-[42px] text-white"
                style={overlayIconStyle}
              />
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
