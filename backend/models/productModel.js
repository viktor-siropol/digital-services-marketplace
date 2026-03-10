import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true },
);

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    name: { type: String, required: true },

    slug: { type: String, required: true, trim: true },

    images: [{ type: String }],
    brand: { type: String, required: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    price: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true },
    countInStock: { type: Number, required: true },
    description: { type: String, required: true },

    reviews: [reviewSchema],
    numReviews: { type: Number, required: true, default: 0 },
    rating: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ seller: 1, slug: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
