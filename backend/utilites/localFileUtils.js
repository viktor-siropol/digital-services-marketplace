import fsPromises from "fs/promises";
import { logCleanupError } from "./logCleanupError.js";

const safeUnlink = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    logCleanupError({
      scope: "safeUnlink",
      target: filePath,
      error,
    });
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
