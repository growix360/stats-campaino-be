import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import catchAsync from "../utils/catchAsync"
import { campaignService } from "../services"
import { User } from "../../generated/client1"
import { campaignStatsService } from "../services"
import { Prisma as PrismaDB2 } from "../../generated/client2"
import { Prisma as PrismaDB1 } from "../../generated/client1"
import config from "../config/config"
import { parseUpdateStatsBody } from "../validations/campaign.validation"

const updateStats = catchAsync(async (req, res) => {
  const user = req.user as User
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }

  let parsed
  try {
    parsed = parseUpdateStatsBody(req.body as Record<string, unknown>)
  } catch (error) {
    const message =
      error instanceof Error && "details" in error
        ? (error as { details: { message: string }[] }).details
            .map((detail) => detail.message)
            .join(", ")
        : error instanceof Error
          ? error.message
          : "Invalid request body"
    throw new ApiError(httpStatus.BAD_REQUEST, message)
  }

  const uploadFile = req.file
    ? { buffer: req.file.buffer, originalname: req.file.originalname }
    : undefined

  if (uploadFile && uploadFile.buffer.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Uploaded file is empty")
  }

  const result = await campaignStatsService.updateStats({
    campaignId: parsed.campaignId,
    targets: parsed.targets,
    userId: user.id,
    upload: uploadFile,
    maxIncrease: config.stats.maxIncreasePerRequest,
    maxUploadEmails: config.stats.maxUploadEmails,
  })

  return res.status(httpStatus.CREATED).send(result)
})

const getCampaigns = catchAsync(async (req, res) => {
  const user: User = req.user as User
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }

  const page = parseInt(req.query.page as string)
  const limit = parseInt(req.query.limit as string)
  const search = req.query.search as string | ""
  const sortBy = req.query.sortBy as keyof PrismaDB1.CampaignOrderByWithRelationInput
  const sortDirection = req.query.sortDirection as PrismaDB1.SortOrder

  const campaigns = await campaignService.getCampaigns({
    userId: user.id,
    page,
    limit,
    search,
    sortBy,
    sortDirection,
  })

  return res.status(httpStatus.OK).json(campaigns)
})

const getCampaignsUpdateStatus = catchAsync(async (req, res) => {
  const user: User = req.user as User
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }

  const page = parseInt(req.query.page as string)
  const limit = parseInt(req.query.limit as string)
  const search = req.query.search as string | ""
  const sortBy = req.query.sortBy as keyof PrismaDB2.CampaignUpdateHistoryOrderByWithRelationInput
  const sortDirection = req.query.sortDirection as PrismaDB2.SortOrder
  const campaignId = req.query.campaignId as string

  const campaigns = await campaignService.getCampaignsUpdateStatus({
    userId: user.id,
    page,
    limit,
    search,
    sortBy,
    sortDirection,
    campaignId,
  })

  return res.status(httpStatus.OK).json(campaigns)
})

const getCurrentStats = catchAsync(async (req, res) => {
  const user: User = req.user as User
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }

  const { campaignId } = req.params
  const stats = await campaignStatsService.getCurrentStats(campaignId)
  return res.status(httpStatus.OK).json(stats)
})

export default {
  getCampaigns,
  updateStats,
  getCurrentStats,
  getCampaignsUpdateStatus,
}
