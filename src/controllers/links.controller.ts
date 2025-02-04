import { Request, Response } from "express"
import { linksService } from "../services"
import catchAsync from "../utils/catchAsync"
import httpStatus from "http-status"

const createShortUrl = catchAsync(async (req: Request, res: Response) => {
  const { originalUrl } = req.body
  const shortUrl = await linksService.createShortUrl(originalUrl)
  res.status(httpStatus.CREATED).json(shortUrl)
})

const getOriginalUrl = catchAsync(async (req: Request, res: Response) => {
  const { shortCode } = req.params
  const originalUrl = await linksService.getOriginalUrl(shortCode)
  const completeUrl = /^https?:\/\//.test(originalUrl) ? originalUrl : `http://${originalUrl}`

  res.redirect(completeUrl)
})

const getAllShortUrls = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const urls = await linksService.getAllShortUrls(page, limit)
  res.status(httpStatus.OK).json(urls)
})

const deleteShortUrl = catchAsync(async (req: Request, res: Response) => {
  const { shortCode } = req.params
  const result = await linksService.deleteShortUrl(shortCode)
  res.status(httpStatus.OK).json(result)
})

export default {
  createShortUrl,
  getOriginalUrl,
  getAllShortUrls,
  deleteShortUrl,
}
