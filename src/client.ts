import { PrismaClient as PrismaClientDB1 } from "@prisma/client" // For the first database
import { PrismaClient as PrismaClientDB2 } from "../node_modules/.prisma/client2"

import { Prisma as PrismaTypesDB1 } from "@prisma/client" // Types for DB1
import { Prisma as PrismaTypesDB2 } from "../node_modules/.prisma/client2" // Types for DB2
import config from "./config/config"

// Define global type to prevent multiple instances in dev mode
interface CustomNodeJsGlobal extends Global {
  prismaDB1: PrismaClientDB1
  prismaDB2: PrismaClientDB2
}

// Prevent multiple Prisma instances in development
declare const global: CustomNodeJsGlobal

// Initialize both clients
const prismaDB1 = global.prismaDB1 || new PrismaClientDB1()
const prismaDB2 = global.prismaDB2 || new PrismaClientDB2()

// Store the clients in the global object in dev mode
if (config.env === "development") {
  global.prismaDB1 = prismaDB1
  global.prismaDB2 = prismaDB2
}

// Export both clients and types
export { prismaDB1, prismaDB2, PrismaTypesDB1, PrismaTypesDB2 }
