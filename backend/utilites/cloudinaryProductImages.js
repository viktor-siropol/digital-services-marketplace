import { Readable } from "stream";
import cloudinary, {
  assertCloudinaryConfigured,
} from "../config/cloudinary.js";

const CLOUDINARY_ROOT_FOLDER =
  process.env.CLOUDINARY_ROOT_FOLDER || "mern-marketplace";

const normalizeCloudinaryPathPart = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const buildCloudinaryAssetFolder = ({ sellerId, productId }) => {
  return [
    CLOUDINARY_ROOT_FOLDER,
    "products",
    normalizeCloudinaryPathPart(sellerId),
    normalizeCloudinaryPathPart(productId),
  ]
    .filter(Boolean)
    .join("/");
};

export const buildCloudinaryImagePublicId = ({
  sellerId,
  productId,
  imageId,
}) => {
  return [
    buildCloudinaryAssetFolder({ sellerId, productId }),
    normalizeCloudinaryPathPart(imageId),
  ]
    .filter(Boolean)
    .join("/");
};

export const uploadBufferToCloudinary = async ({
  buffer,
  publicId,
  assetFolder,
}) => {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: publicId,
        asset_folder: assetFolder,
        overwrite: true,
        format: "webp",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

export const buildCloudinaryImageUrls = ({ publicId }) => {
  assertCloudinaryConfigured();

  return {
    original: cloudinary.url(publicId, {
      resource_type: "image",
      secure: true,
      format: "webp",
      transformation: [
        {
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    }),

    medium: cloudinary.url(publicId, {
      resource_type: "image",
      secure: true,
      format: "webp",
      transformation: [
        {
          width: 900,
          height: 700,
          crop: "fill",
          gravity: "auto",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    }),

    thumbnail: cloudinary.url(publicId, {
      resource_type: "image",
      secure: true,
      format: "webp",
      transformation: [
        {
          width: 320,
          height: 240,
          crop: "fill",
          gravity: "auto",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    }),
  };
};

export const deleteCloudinaryImageByPublicId = async (publicId) => {
  if (!publicId) return;

  assertCloudinaryConfigured();

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("Failed to delete Cloudinary image:", {
      publicId,
      message: error.message,
    });
  }
};

export const getPublicIdFromProductImage = ({ sellerId, productId, image }) => {
  if (!image?.imageId) return "";

  return buildCloudinaryImagePublicId({
    sellerId,
    productId,
    imageId: image.imageId,
  });
};

export const deleteManyCloudinaryProductImages = async ({
  sellerId,
  productId,
  images = [],
}) => {
  for (const image of images.filter(Boolean)) {
    const publicId = getPublicIdFromProductImage({
      sellerId,
      productId,
      image,
    });

    await deleteCloudinaryImageByPublicId(publicId);
  }
};
