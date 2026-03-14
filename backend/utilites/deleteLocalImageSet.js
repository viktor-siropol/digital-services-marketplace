import fsPromises from "fs/promises";

const safeUnlink = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
  }
};

export const deleteLocalImageSet = async (image) => {
  const filePaths = [image.original, image.medium, image.thumbnail].filter(
    Boolean,
  );

  for (const filePath of filePaths) {
    const normalizedPath = filePath.startsWith("/")
      ? filePath.slice(1)
      : filePath;

    await safeUnlink(normalizedPath);
  }
};

export const deleteManyLocalImageSets = async (images = []) => {
  for (const image of images) {
    await deleteLocalImageSet(image);
  }
};
