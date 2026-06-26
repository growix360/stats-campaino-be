import { Server } from "http"
import app from "./app"
import { prismaDB1, prismaDB2 } from "./client"
import config from "./config/config"
import logger from "./config/logger"

let server: Server
Promise.all([prismaDB1.$connect(), prismaDB2.$connect()]).then(() => {
  logger.info("Connected to SQL databases (DB1 + DB2)")
  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`)
  })
})

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed")
      process.exit(1)
    })
  } else {
    process.exit(1)
  }
}

const unexpectedErrorHandler = (error: unknown) => {
  logger.error(error)
  exitHandler()
}

process.on("uncaughtException", unexpectedErrorHandler)
process.on("unhandledRejection", unexpectedErrorHandler)

process.on("SIGTERM", () => {
  logger.info("SIGTERM received")
  if (server) {
    server.close()
  }
})
