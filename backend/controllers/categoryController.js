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

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  if (!categories) {
    res.status(400);
    throw new Error("No categories yet");
  }
  res.json(categories);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  category.name = req.body.name || category.name;
  const updatedCategory = await category.save();
  res.json(updatedCategory);
});
const deleteCategory = asyncHandler(async (req, res) => {
  const deleted = await Category.findByIdAndDelete(req.params.id);

  if (!deleted) {
    res.status(404);
    throw new Error("Category not found");
  }

  res.json({ message: "Category deleted" });
});

export { createCategory, getCategories, updateCategory, deleteCategory };
