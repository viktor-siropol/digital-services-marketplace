const formatProductImageForClient = (image = {}) => ({
  imageId: image.imageId,
  original: image.original,
  medium: image.medium,
  thumbnail: image.thumbnail,
  blurDataURL: image.blurDataURL,
  alt: image.alt || "",
});

const formatReviewForClient = (review = {}) => ({
  user: review.user?._id
    ? review.user._id.toString()
    : (review.user?.toString?.() ?? review.user),
  name: review.name,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

export const formatProductForClient = (
  product,
  { includeProcessingMeta = true } = {},
) => {
  const raw = product?.toObject ? product.toObject() : product;

  const formatted = {
    _id: raw._id?.toString?.() ?? raw._id,
    seller: raw.seller?._id
      ? raw.seller._id.toString()
      : (raw.seller?.toString?.() ?? raw.seller),
    name: raw.name,
    slug: raw.slug,
    images: Array.isArray(raw.images)
      ? raw.images.map(formatProductImageForClient)
      : [],
    brand: raw.brand,
    category: raw.category?._id
      ? raw.category._id.toString()
      : (raw.category?.toString?.() ?? raw.category),
    price: raw.price,
    quantity: raw.quantity,
    countInStock: raw.countInStock,
    description: raw.description,
    numReviews: raw.numReviews ?? 0,
    rating: raw.rating ?? 0,
    reviews: Array.isArray(raw.reviews)
      ? raw.reviews.map(formatReviewForClient)
      : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };

  if (includeProcessingMeta) {
    formatted.status = raw.status;
    formatted.processingError = raw.processingError || "";
  }

  return formatted;
};
