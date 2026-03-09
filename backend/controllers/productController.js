import asyncHandler from "../middlewares/asyncHandler.js";
import Product from "../models/productModel.js";

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
  const {
    name,
    brand,
    category,
    price,
    quantity,
    countInStock,
    description,
    image,
  } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!brand) return res.status(400).json({ error: "Brand is required" });
  if (!description)
    return res.status(400).json({ error: "Description is required" });
  if (price === undefined)
    return res.status(400).json({ error: "Price is required" });
  if (!category) return res.status(400).json({ error: "Category is required" });
  if (quantity === undefined)
    return res.status(400).json({ error: "Quantity is required" });
  if (countInStock === undefined)
    return res.status(400).json({ error: "CountInStock is required" });
  if (!image) return res.status(400).json({ error: "Image is required" });

  const sellerId = req.user._id;

  const slug = await generateUniqueSlug({
    sellerId,
    name,
  });

  const product = await Product.create({
    seller: sellerId,
    name,
    slug,
    brand,
    category,
    price,
    quantity,
    countInStock,
    description,
    image,
  });

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
  product.price = req.body.price ?? product.price;
  product.quantity = req.body.quantity ?? product.quantity;
  product.countInStock = req.body.countInStock ?? product.countInStock;
  product.description = req.body.description ?? product.description;
  product.image = req.body.image ?? product.image;

  const updatedProduct = await product.save();

  res.json({
    ...updatedProduct.toObject(),
    canonicalUrl: `/api/products/p/${updatedProduct._id}/${updatedProduct.slug}`,
  });
});
