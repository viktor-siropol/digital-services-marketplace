import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ProductImagePreview from "../../components/ProductImagePreview";
import { useAddProductMutation } from "../../redux/api/productApiSlice";
import { useGetCategoriesQuery } from "../../redux/api/categoryApiSlice";

const CreateProduct = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [countInStock, setCountInStock] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const imagesRef = useRef([]);

  const [addProduct, { isLoading: creating }] = useAddProductMutation();
  const {
    data: categories = [],
    isLoading: loadingCategories,
    error: categoriesError,
  } = useGetCategoriesQuery();

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const imagesChangeHandler = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (!selectedFiles.length) {
      return;
    }

    const mappedFiles = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...mappedFiles]);
    e.target.value = "";
  };

  const removeImageHandler = (id) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);

      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return prev.filter((img) => img.id !== id);
    });
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!brand.trim()) {
      toast.error("Brand is required");
      return;
    }

    if (!category) {
      toast.error("Category is required");
      return;
    }

    if (!price) {
      toast.error("Price is required");
      return;
    }

    if (!quantity) {
      toast.error("Quantity is required");
      return;
    }

    if (!countInStock) {
      toast.error("Count in stock is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!images.length) {
      toast.error("At least one image is required");
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

    for (const image of images) {
      formData.append("images", image.file);
    }

    try {
      await addProduct(formData).unwrap();

      toast.success("Product created. Image processing started.");

      images.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      setName("");
      setBrand("");
      setCategory("");
      setPrice("");
      setQuantity("");
      setCountInStock("");
      setDescription("");
      setImages([]);
      setPreviewImage(null);
    } catch (error) {
      toast.error(
        error?.data?.message || error?.error || "Failed to create product",
      );
    }
  };

  return (
    <div className="relative z-0 min-h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-20 top-12 h-56 w-56 rounded-full bg-violet-200/30" />
        <div className="absolute -right-24 top-28 h-52 w-52 rounded-full bg-slate-200/40" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-100/30" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-medium text-violet-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Seller workspace
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Create Product
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Create a new listing and add the product details below.
          </p>
        </div>

        {(loadingCategories || creating) && <Loader />}

        {categoriesError && (
          <Message variant="danger">
            {categoriesError?.data?.message ||
              categoriesError?.error ||
              "Failed to load categories"}
          </Message>
        )}

        <form
          onSubmit={submitHandler}
          className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="border-b border-slate-100 bg-linear-to-r from-violet-50 via-fuchsia-50 to-cyan-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">Product draft</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Start with core details, then attach images for background
              processing.
            </p>
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
                  Product images
                </label>

                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-violet-700 shadow-sm">
                  {images.length} selected
                </span>
              </div>

              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                onChange={imagesChangeHandler}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />

              <p className="mt-2 text-xs text-slate-500">
                PNG, JPG or WEBP. You can add files in multiple steps.
              </p>

              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {images.map((image) => (
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
                        onClick={() => removeImageHandler(image.id)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-medium text-rose-600 shadow hover:bg-white"
                        aria-label="Remove selected image"
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
                disabled={creating}
                className="inline-flex items-center rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(99,102,241,0.28)] transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create product"}
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

export default CreateProduct;
