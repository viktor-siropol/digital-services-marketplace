import asyncHandler from "../middlewares/asyncHandler.js";
import Favorite from "../models/favoriteModel.js";
import Product from "../models/productModel.js";
import { formatProductForClient } from "../utilites/formatProductForClient.js";

export const getMyFavoriteProducts = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "product",
      match: { status: "ready" },
    });

  const validProducts = favorites
    .filter((favorite) => favorite.product)
    .map((favorite) =>
      formatProductForClient(favorite.product, {
        includeProcessingMeta: false,
      }),
    );

  res.json(validProducts);
});

export const addProductToFavorites = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.productId,
    status: "ready",
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const existingFavorite = await Favorite.findOne({
    user: req.user._id,
    product: product._id,
  });

  if (existingFavorite) {
    res.json({ message: "Product is already in favorites" });
    return;
  }

  await Favorite.create({
    user: req.user._id,
    product: product._id,
  });

  res.status(201).json({ message: "Product added to favorites" });
});

export const removeProductFromFavorites = asyncHandler(async (req, res) => {
  await Favorite.deleteOne({
    user: req.user._id,
    product: req.params.productId,
  });

  res.json({ message: "Product removed from favorites" });
});
