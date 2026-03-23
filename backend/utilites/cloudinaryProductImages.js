import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import { logCleanupError } from "./logCleanupError.js";

export const buildCloudinaryImagePublicId = ({
  sellerId,
  productId,
  imageId,
}) => {
  return `products/${sellerId}/${productId}/${imageId}`;
};

export const buildCloudinaryAssetFolder = ({ sellerId, productId }) => {
  return `products/${sellerId}/${productId}`;
};

export const uploadBufferToCloudinary = ({ buffer, publicId, assetFolder }) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: publicId,
        asset_folder: assetFolder,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

export const buildCloudinaryImageUrls = ({ publicId }) => {
  const original = cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    type: "upload",
    transformation: [
      {
        fetch_format: "auto",
        quality: "auto:good",
      },
    ],
  });

  const medium = cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    type: "upload",
    transformation: [
      {
        width: 900,
        height: 900,
        crop: "limit",
        fetch_format: "auto",
        quality: "auto:good",
      },
    ],
  });

  const thumbnail = cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    type: "upload",
    transformation: [
      {
        width: 320,
        height: 320,
        crop: "fill",
        gravity: "auto",
        fetch_format: "auto",
        quality: "auto:good",
      },
    ],
  });

  return {
    original,
    medium,
    thumbnail,
  };
};

export const deleteCloudinaryImageByPublicId = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    logCleanupError({
      scope: "deleteCloudinaryImageByPublicId",
      target: publicId,
      error,
    });
  }
};

export const deleteManyCloudinaryProductImages = async ({
  sellerId,
  productId,
  images = [],
}) => {
  for (const image of images) {
    const publicId = buildCloudinaryImagePublicId({
      sellerId,
      productId,
      imageId: image.imageId,
    });

    await deleteCloudinaryImageByPublicId(publicId);
  }
};
