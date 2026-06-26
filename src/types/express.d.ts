import { User } from "../../generated/client1"

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "name" | "role">
    }
  }
}
