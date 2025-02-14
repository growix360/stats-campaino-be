import { Request, Response, NextFunction } from "express-serve-static-core"

export interface CustomParamsDictionary {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<Response>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err))
  }
}

export default catchAsync
