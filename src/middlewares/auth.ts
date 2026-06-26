import passport from "passport"
import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import { normalizeRoles } from "../utils/fieldMapping"
import { NextFunction, Request, Response } from "express"
import { Role, User } from "../../generated/client1"

const verifyCallback =
  (
    req: Request,
    resolve: (value?: unknown) => void,
    reject: (reason?: unknown) => void,
    requiredRoles: Role[],
  ) =>
  async (err: unknown, user: User | false, info: unknown) => {
    if (err || info || !user) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate"))
    }
    req.user = user

    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden"))
    }

    resolve()
  }

const auth =
  (...requiredRoles: (Role | string)[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const roles = requiredRoles.length ? normalizeRoles(...requiredRoles) : []

    return new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, resolve, reject, roles),
      )(req, res, next)
    })
      .then(() => next())
      .catch((err) => next(err))
  }

export default auth
