import asyncHandler from "../middlewares/asyncHandler.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Category from "../models/categoryModel.js";
import { processProductImages } from "../utilites/processProductImages.js";
import {
  deleteManyLocalFiles,
  localFilesExist,
} from "../utilites/localFileUtils.js";
import { deleteManyCloudinaryProductImages } from "../utilites/cloudinaryProductImages.js";
import { enqueueImageProcessingJob } from "../queues/imageQueue.js";
import { formatProductForClient } from "../utilites/formatProductForClient.js";
import { logError } from "../utilites/logError.js";
import {
  decorateProductsWithAvailability,
  expireExpiredOrderReservations,
  getReservedQuantityMap,
} from "../utilites/productAvailability.js";

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

const parseRetainedImageIds = (value, fallback = []) => {
  if (typeof value === "undefined") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error("retainedImageIds must be an array");
    }

    return parsed;
  } catch {
    throw new Error("retainedImageIds must be a valid JSON array");
  }
};

const recalculateProductReviewStats = (product) => {
  product.numReviews = product.reviews.length;

  product.rating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
        product.reviews.length
      : 0;
};

const getActiveReservedQtyForProduct = async (productId) => {
  await expireExpiredOrderReservations();

  const reservedQuantityMap = await getReservedQuantityMap([productId]);

  return reservedQuantityMap.get(productId.toString()) || 0;
};

const getImageProcessingMode = () => {
  return process.env.IMAGE_PROCESSING_MODE === "sync" ? "sync" : "queue";
};

const processProductImagesSynchronously = async ({
  product,
  files,
  sellerId,
}) => {
  const processedImages = await processProductImages(files, {
    sellerId: sellerId.toString(),
    productId: product._id.toString(),
    deleteInputOnSuccess: true,
    deleteInputOnError: false,
  });

  product.images = processedImages;
  product.tempUploads = [];
  product.status = "ready";
  product.processingError = "";

  await product.save();

  return product;
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

  if (getImageProcessingMode() === "sync") {
    try {
      const readyProduct = await processProductImagesSynchronously({
        product,
        files: req.files,
        sellerId,
      });

      return res.status(201).json(formatProductForClient(readyProduct));
    } catch (error) {
      await deleteManyLocalFiles(tempUploads);
      await Product.deleteOne({ _id: product._id });

      logError({
        level: "error",
        scope: "createProduct.syncImageProcessing",
        message: "Failed to process product images synchronously",
        error,
        meta: {
          productId: product._id.toString(),
          sellerId: sellerId.toString(),
        },
      });

      res.status(500);
      throw new Error("Failed to process product images");
    }
  }

  try {
    await enqueueImageProcessingJob(product._id.toString());
  } catch (error) {
    await deleteManyLocalFiles(tempUploads);
    await Product.deleteOne({ _id: product._id });

    logError({
      level: "error",
      scope: "createProduct.enqueueImageProcessingJob",
      message: "Failed to enqueue image processing job",
      error,
      meta: {
        productId: product._id.toString(),
        sellerId: sellerId.toString(),
      },
    });

    res.status(500);
    throw new Error("Failed to enqueue image processing job");
  }

  return res.status(201).json(formatProductForClient(product));
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

  const retainedImageIds = parseRetainedImageIds(
    req.body.retainedImageIds,
    product.images.map((img) => img.imageId),
  );

  const keptImages = product.images.filter((img) =>
    retainedImageIds.includes(img.imageId),
  );

  const removedImages = product.images.filter(
    (img) => !retainedImageIds.includes(img.imageId),
  );

  let newProcessedImages = [];

  if (req.files?.length) {
    newProcessedImages = await processProductImages(req.files, {
      sellerId: req.user._id.toString(),
      productId: product._id.toString(),
      deleteInputOnSuccess: true,
      deleteInputOnError: true,
    });
  }

  if (keptImages.length === 0 && newProcessedImages.length === 0) {
    res.status(400);
    throw new Error("Product must have at least one image");
  }

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

  if (req.body.countInStock !== undefined) {
    const nextCountInStock = Number(req.body.countInStock);

    if (Number.isNaN(nextCountInStock) || nextCountInStock < 0) {
      res.status(400);
      throw new Error("CountInStock must be a valid non-negative number");
    }

    const activeReservedQty = await getActiveReservedQtyForProduct(product._id);

    if (nextCountInStock < activeReservedQty) {
      res.status(409);
      throw new Error(
        `Count in stock cannot be set below ${activeReservedQty} because unpaid orders are currently reserving this product`,
      );
    }

    product.countInStock = nextCountInStock;
  }

  product.description = req.body.description ?? product.description;
  product.images = [...keptImages, ...newProcessedImages];

  const updatedProduct = await product.save();

  await deleteManyCloudinaryProductImages({
    sellerId: product.seller.toString(),
    productId: product._id.toString(),
    images: removedImages,
  });

  const [productWithAvailability] = await decorateProductsWithAvailability([
    updatedProduct,
  ]);

  res.json(formatProductForClient(productWithAvailability));
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

  const activeReservedQty = await getActiveReservedQtyForProduct(product._id);

  if (activeReservedQty > 0) {
    res.status(409);
    throw new Error(
      "Cannot delete this product while unpaid orders are actively reserving stock",
    );
  }

  const imagesToDelete = product.images;
  const tempUploadsToDelete = product.tempUploads;

  await Product.deleteOne({ _id: product._id });

  await deleteManyCloudinaryProductImages({
    sellerId: product.seller.toString(),
    productId: product._id.toString(),
    images: imagesToDelete,
  });

  await deleteManyLocalFiles(tempUploadsToDelete);

  res.json({ message: "Product deleted successfully" });
});

export const getPublicProductsBrowse = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const pageSize = Math.min(40, Math.max(1, Number(req.query.pageSize) || 20));
  const requestedPage = Math.max(1, Number(req.query.pageNumber) || 1);

  const keyword = req.query.keyword?.toString().trim() || "";
  const categoryId = req.query.category?.toString().trim() || "";
  const stockFilter = req.query.stock?.toString().trim() || "all";
  const sortBy = req.query.sortBy?.toString().trim() || "newest";

  const minPrice =
    req.query.minPrice === undefined || req.query.minPrice === ""
      ? null
      : Number(req.query.minPrice);

  const maxPrice =
    req.query.maxPrice === undefined || req.query.maxPrice === ""
      ? null
      : Number(req.query.maxPrice);

  const mongoQuery = {
    status: "ready",
  };

  if (categoryId && categoryId !== "all") {
    mongoQuery.category = categoryId;
  }

  if (minPrice !== null && !Number.isNaN(minPrice)) {
    mongoQuery.price = {
      ...(mongoQuery.price || {}),
      $gte: minPrice,
    };
  }

  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    mongoQuery.price = {
      ...(mongoQuery.price || {}),
      $lte: maxPrice,
    };
  }

  if (keyword) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matchingCategories = await Category.find({
      name: { $regex: escapedKeyword, $options: "i" },
    }).select("_id");

    const matchingCategoryIds = matchingCategories.map(
      (category) => category._id,
    );

    mongoQuery.$or = [
      { name: { $regex: escapedKeyword, $options: "i" } },
      { brand: { $regex: escapedKeyword, $options: "i" } },
      ...(matchingCategoryIds.length
        ? [{ category: { $in: matchingCategoryIds } }]
        : []),
    ];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    "price-asc": { price: 1, createdAt: -1 },
    "price-desc": { price: -1, createdAt: -1 },
    "name-asc": { name: 1, createdAt: -1 },
  };

  const sortConfig = sortMap[sortBy] || sortMap.newest;

  const matchedProducts = await Product.find(mongoQuery).sort(sortConfig);

  const productsWithAvailability =
    await decorateProductsWithAvailability(matchedProducts);

  let visibleProducts = productsWithAvailability;

  if (stockFilter === "in-stock") {
    visibleProducts = visibleProducts.filter(
      (product) => Number(product.availableStock || 0) > 0,
    );
  }

  if (stockFilter === "out-of-stock") {
    visibleProducts = visibleProducts.filter(
      (product) => Number(product.availableStock || 0) <= 0,
    );
  }

  const totalProducts = visibleProducts.length;
  const pages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const page = Math.min(requestedPage, pages);

  const startIndex = (page - 1) * pageSize;
  const paginatedProducts = visibleProducts.slice(
    startIndex,
    startIndex + pageSize,
  );

  res.json({
    products: paginatedProducts.map((product) =>
      formatProductForClient(product, { includeProcessingMeta: false }),
    ),
    page,
    pages,
    totalProducts,
    pageSize,
  });
});

export const getPublicProducts = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const products = await Product.find({ status: "ready" }).sort({
    createdAt: -1,
  });

  const productsWithAvailability =
    await decorateProductsWithAvailability(products);

  res.json(
    productsWithAvailability.map((product) =>
      formatProductForClient(product, { includeProcessingMeta: false }),
    ),
  );
});

export const getPublicProductById = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const product = await Product.findOne({
    _id: req.params.id,
    status: "ready",
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const [productWithAvailability] = await decorateProductsWithAvailability([
    product,
  ]);

  res.json(
    formatProductForClient(productWithAvailability, {
      includeProcessingMeta: false,
    }),
  );
});

export const createProductReview = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    status: "ready",
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const numericRating = Number(req.body.rating);
  const trimmedComment = req.body.comment?.toString().trim() || "";

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    res.status(400);
    throw new Error("Rating must be an integer between 1 and 5");
  }

  if (!trimmedComment) {
    res.status(400);
    throw new Error("Comment is required");
  }

  const alreadyReviewed = product.reviews.find(
    (review) => review.user.toString() === req.user._id.toString(),
  );

  if (alreadyReviewed) {
    res.status(400);
    throw new Error("You have already reviewed this product");
  }

  const hasPaidOrderForProduct = await Order.exists({
    user: req.user._id,
    isPaid: true,
    orderItems: {
      $elemMatch: {
        product: product._id,
      },
    },
  });

  if (!hasPaidOrderForProduct) {
    res.status(403);
    throw new Error(
      "Only customers who purchased and paid for this product can review it",
    );
  }

  product.reviews.push({
    name: req.user.username || "Customer",
    rating: numericRating,
    comment: trimmedComment,
    user: req.user._id,
  });

  recalculateProductReviewStats(product);

  await product.save();

  res.status(201).json({
    message: "Review added successfully",
  });
});

export const getMyProducts = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const products = await Product.find({ seller: req.user._id }).sort({
    createdAt: -1,
  });

  const productsWithAvailability =
    await decorateProductsWithAvailability(products);

  res.json(
    productsWithAvailability.map((product) => formatProductForClient(product)),
  );
});

export const getMyProductById = asyncHandler(async (req, res) => {
  await expireExpiredOrderReservations();

  const product = await Product.findOne({
    _id: req.params.id,
    seller: req.user._id,
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const [productWithAvailability] = await decorateProductsWithAvailability([
    product,
  ]);

  res.json(formatProductForClient(productWithAvailability));
});

export const retryProductImageProcessing = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    seller: req.user._id,
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.status === "ready") {
    res.status(400);
    throw new Error("Product is already ready");
  }

  if (product.status === "processing") {
    res.status(409);
    throw new Error("Product is already processing");
  }

  if (!product.tempUploads || product.tempUploads.length === 0) {
    res.status(400);
    throw new Error("Retry is not available because temp uploads are missing");
  }

  const inputsExist = await localFilesExist(product.tempUploads);

  if (!inputsExist) {
    product.processingError =
      "Retry is not available because temp upload files are missing. Re-upload images.";
    await product.save();

    res.status(409);
    throw new Error(
      "Retry is not available because temp upload files are missing",
    );
  }

  const previousError = product.processingError;

  product.status = "processing";
  product.processingError = "";
  await product.save();

  if (getImageProcessingMode() === "sync") {
    try {
      const files = product.tempUploads.map((filePath) => ({
        path: filePath,
        filename: filePath.split(/[\\/]/).pop(),
      }));

      const readyProduct = await processProductImagesSynchronously({
        product,
        files,
        sellerId: req.user._id,
      });

      return res.json({
        message: "Image processing completed",
        productId: readyProduct._id,
        status: readyProduct.status,
      });
    } catch (error) {
      product.status = "failed";
      product.processingError =
        previousError || error.message || "Failed to process images";
      await product.save();

      res.status(500);
      throw new Error("Failed to process images");
    }
  }

  try {
    await enqueueImageProcessingJob(product._id.toString());
  } catch (error) {
    product.status = "failed";
    product.processingError =
      previousError || "Failed to enqueue retry image processing job";
    await product.save();

    logError({
      level: "error",
      scope: "retryProductImageProcessing.enqueueImageProcessingJob",
      message: "Failed to enqueue retry image processing job",
      error,
      meta: {
        productId: product._id.toString(),
        sellerId: req.user._id.toString(),
      },
    });

    res.status(500);
    throw new Error("Failed to enqueue retry image processing job");
  }

  res.json({
    message: "Image processing retry started",
    productId: product._id,
    status: product.status,
  });
});
