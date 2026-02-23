import asyncHandler from "../middlewares/asyncHandler.js";
import Category from "../models/categoryModel.js";

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Name is required");
  }

  const exists = await Category.findOne({ name: name.trim() });
  if (exists) {
    res.status(400);
    throw new Error("Category already exists");
  }

  const newCategory = await Category.create({ name: name.trim() });
  res.status(201).json(newCategory);
});

const getCategories = asyncHandler(async (req, res) => {});
const getCategoryById = asyncHandler(async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    res.json(category);
  } catch (error) {
    console.log(error);
    return res.status(400).json(error.message);
  }
});

const updateCategory = asyncHandler(async (req, res) => {});
const deleteCategory = asyncHandler(async (req, res) => {});

export {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
