// src/types/express.d.ts
import { User as PrismaUser } from "@prisma/client" // Import Prisma User model

declare global {
  namespace Express {
    // Extend the Express Request interface to include `user` of type PrismaUser
    interface Request {
      user?: PrismaUser // Optional user field from Prisma
    }
  }
}
