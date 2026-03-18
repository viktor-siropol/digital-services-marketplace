import fsPromises from "fs/promises";

const safeUnlink = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
  }
};

const normalizeLocalPath = (filePath) => {
  return filePath.startsWith("/") ? filePath.slice(1) : filePath;
};

export const localFilesExist = async (filePaths = []) => {
  for (const filePath of filePaths.filter(Boolean)) {
    try {
      await fsPromises.access(normalizeLocalPath(filePath));
    } catch (error) {
      return false;
    }
  }

  return true;
};

export const deleteManyLocalFiles = async (filePaths = []) => {
  for (const filePath of filePaths.filter(Boolean)) {
    await safeUnlink(normalizeLocalPath(filePath));
  }
};

export const deleteLocalImageSet = async (image) => {
  const filePaths = [
    image.original,
    image.medium,
    image.thumbnail,
  ].filter(Boolean);

  await deleteManyLocalFiles(filePaths);
};

export const deleteManyLocalImageSets = async (images = []) => {
  for (const image of images) {
    await deleteLocalImageSet(image);
  }
};