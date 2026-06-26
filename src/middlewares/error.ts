import { ErrorRequestHandler } from "express"
import httpStatus from "http-status"
import config from "../config/config"
import logger from "../config/logger"
import ApiError from "../utils/ApiError"
import { PrismaTypesDB1, PrismaTypesDB2 } from "../client"

const isPrismaClientError = (error: unknown): boolean =>
  error instanceof PrismaTypesDB1.PrismaClientKnownRequestError ||
  error instanceof PrismaTypesDB2.PrismaClientKnownRequestError

export const errorConverter: ErrorRequestHandler = (err, req, res, next) => {
  let error = err
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode ??
      (isPrismaClientError(error) ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR)
    const message =
      error.message || (httpStatus as Record<number, string>)[statusCode] || "Error"
    const isOperational = statusCode < httpStatus.INTERNAL_SERVER_ERROR
    error = new ApiError(statusCode, message, isOperational, err.stack)
  }
  next(error)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let { statusCode, message } = err
  if (config.env === "production" && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR]
  }

  res.locals.errorMessage = err.message

  const response = {
    code: statusCode,
    message,
    ...(config.env === "development" && { stack: err.stack }),
  }

  if (config.env === "production" && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR]
  }

  if (statusCode >= httpStatus.INTERNAL_SERVER_ERROR || config.env === "development") {
    logger.error(err)
  } else {
    logger.warn(`${statusCode}: ${err.message}`)
  }

  res.status(statusCode).send(response)
}
