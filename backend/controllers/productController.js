import asyncHandler from "../middlewares/asyncHandler.js";
import Product from "../models/productModel.js";
import { processProductImages } from "../utilities/processProductImages.js";
import {
  deleteManyLocalFiles,
  deleteManyLocalImageSets,
} from "../utilities/deleteLocalImageSet.js";
import { imageQueue } from "../queues/imageQueue.js";

const slugify = (text) =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const generateUniqueSlug = async ({ sellerId, name, excludeId }) => {
  const base = slugify(name);
  let slug = base;
  let i = 2;

  while (
    await Product.exists({
      seller: sellerId,
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    slug = `${base}-${i}`;
    i += 1;
  }

  return slug;
};

export const createProduct = asyncHandler(async (req, res) => {
  const { name, brand, category, price, quantity, countInStock, description } =
    req.body;

  if (!name) {
    res.status(400);
    throw new Error("Name is required");
  }

  if (!brand) {
    res.status(400);
    throw new Error("Brand is required");
  }

  if (!category) {
    res.status(400);
    throw new Error("Category is required");
  }

  if (price === undefined) {
    res.status(400);
    throw new Error("Price is required");
  }

  if (quantity === undefined) {
    res.status(400);
    throw new Error("Quantity is required");
  }

  if (countInStock === undefined) {
    res.status(400);
    throw new Error("CountInStock is required");
  }

  if (!description) {
    res.status(400);
    throw new Error("Description is required");
  }

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("At least one image is required");
  }

  const sellerId = req.user._id;

  const slug = await generateUniqueSlug({
    sellerId,
    name,
  });

  const tempUploads = req.files.map((file) => file.path);

  const product = await Product.create({
    seller: sellerId,
    name,
    slug,
    images: [],
    tempUploads,
    status: "processing",
    processingError: "",
    brand,
    category,
    price: Number(price),
    quantity: Number(quantity),
    countInStock: Number(countInStock),
    description,
  });

  try {
    await imageQueue.add(
      "process-product-images",
      {
        productId: product._id.toString(),
      },
      {
        jobId: `product-images:${product._id}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 1,
      },
    );
  } catch (error) {
    await deleteManyLocalFiles(tempUploads);
    await Product.deleteOne({ _id: product._id });

    res.status(500);
    throw new Error("Failed to enqueue image processing job");
  }

  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    seller: req.user._id,
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  let retainedImageIds = product.images.map((img) => img.imageId);

  if (typeof req.body.retainedImageIds !== "undefined") {
    try {
      const parsed = JSON.parse(req.body.retainedImageIds);

      if (!Array.isArray(parsed)) {
        res.status(400);
        throw new Error("retainedImageIds must be a JSON array");
      }

      retainedImageIds = parsed;
    } catch (error) {
      res.status(400);
      throw new Error("retainedImageIds must be a valid JSON array");
    }
  }

  const keptImages = product.images.filter((img) =>
    retainedImageIds.includes(img.imageId),
  );

  const removedImages = product.images.filter(
    (img) => !retainedImageIds.includes(img.imageId),
  );

  if (keptImages.length === 0 && (!req.files || req.files.length === 0)) {
    res.status(400);
    throw new Error("Product must have at least one image");
  }

  const newImages =
    req.files && req.files.length > 0
      ? await processProductImages(req.files)
      : [];

  if (req.body.name && req.body.name.trim() !== product.name) {
    const newName = req.body.name.trim();

    product.name = newName;
    product.slug = await generateUniqueSlug({
      sellerId: req.user._id,
      name: newName,
      excludeId: product._id,
    });
  }

  product.brand = req.body.brand ?? product.brand;
  product.category = req.body.category ?? product.category;
  product.price =
    req.body.price !== undefined ? Number(req.body.price) : product.price;
  product.quantity =
    req.body.quantity !== undefined
      ? Number(req.body.quantity)
      : product.quantity;
  product.countInStock =
    req.body.countInStock !== undefined
      ? Number(req.body.countInStock)
      : product.countInStock;
  product.description = req.body.description ?? product.description;

  product.images = [...keptImages, ...newImages];

  const updatedProduct = await product.save();

  await deleteManyLocalImageSets(removedImages);

  res.json(updatedProduct);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    seller: req.user._id,
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const imagesToDelete = product.images;
  const tempUploadsToDelete = product.tempUploads;

  await Product.deleteOne({ _id: product._id });

  await deleteManyLocalImageSets(imagesToDelete);
  await deleteManyLocalFiles(tempUploadsToDelete);

  res.json({ message: "Product deleted successfully" });
});

export const getPublicProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ status: "ready" })
    .select("-tempUploads -processingError")
    .sort({ createdAt: -1 });

  res.json(products);
});

export const getPublicProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    status: "ready",
  }).select("-tempUploads -processingError");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const slugMatches = !req.params.slug || req.params.slug === product.slug;
  const canonicalPath = `/products/${product._id}/${product.slug}`;

  res.json({
    product,
    slugMatches,
    canonicalPath,
  });
});

export const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ seller: req.user._id })
    .select("-tempUploads")
    .sort({ createdAt: -1 });

  res.json(products);
});

export const getMyProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    seller: req.user._id,
  }).select("-tempUploads");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});
