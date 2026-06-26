import multer from "multer"
import httpStatus from "http-status"
import ApiError from "./ApiError"

const storage = multer.memoryStorage()

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = [".csv", ".txt"]
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."))
  if (!allowed.includes(ext)) {
    return cb(new ApiError(httpStatus.BAD_REQUEST, "Only .csv and .txt files are allowed"))
  }
  return cb(null, true)
}

export const statsUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
})

export default statsUpload
