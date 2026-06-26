import express from "express"
import helmet from "helmet"
// import compression from "compression"
import cors from "cors"
import passport from "passport"
import httpStatus from "http-status"
import config from "./config/config"
import morgan from "./config/morgan"
import xss from "./middlewares/xss"
import { jwtStrategy } from "./config/passport"
import { authLimiter } from "./middlewares/rateLimiter"
import routes from "./routes/v1"
import { errorConverter, errorHandler } from "./middlewares/error"
import ApiError from "./utils/ApiError"
import { Request, Response, NextFunction } from "express"
import { prismaDB1, prismaDB2 } from "./client"

const app = express()

if (config.env !== "test") {
  app.use(morgan.successHandler)
  app.use(morgan.errorHandler)
}

// set security HTTP headers
app.use(helmet())

// parse json request body
app.use(express.json())

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }))

// sanitize request data
app.use(xss())

// gzip compression
// app.use(compression());

// enable cors
const corsOptions =
  config.env === "production" && config.cors.origins.length > 0
    ? { origin: config.cors.origins }
    : {}
app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

// jwt authentication
app.use(passport.initialize())
passport.use("jwt", jwtStrategy)

// limit repeated failed requests to auth endpoints
if (config.env === "production") {
  app.use("/v1/auth", authLimiter)
}
app.use(express.raw({ type: "text/plain" }))

// v1 api routes
app.use("/v1", routes)

// healthcheck
app.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await Promise.all([prismaDB1.$queryRaw`SELECT 1`, prismaDB2.$queryRaw`SELECT 1`])
    res.status(httpStatus.OK).send({ message: "ok", databases: { db1: "ok", db2: "ok" } })
  } catch (error) {
    next(error)
  }
})

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"))
})

// convert error to ApiError, if needed
app.use(errorConverter)

// handle error
app.use(errorHandler)

export default app
