import multer from "multer"
import httpStatus from "http-status"
import ApiError from "./ApiError"
import { NextFunction, Request, Response } from "express"

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

export const handleMulterError = (
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(httpStatus.BAD_REQUEST, "File too large. Maximum size is 10 MB."))
    }
    return next(new ApiError(httpStatus.BAD_REQUEST, err.message))
  }
  return next(err)
}

export const uploadStatsFile = (req: Request, res: Response, next: NextFunction) => {
  statsUpload.single("file")(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next)
    }
    next()
  })
}

export default statsUpload
