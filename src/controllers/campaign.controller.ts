import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import catchAsync from "../utils/catchAsync"
import { campaignService } from "../services"
import { User } from "@prisma/client"

const createCampaign = catchAsync(async (req, res) => {
  const user: User = req.user as User
  const { campaignId, multiplier } = req.body
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }
  const campaign = await campaignService.createCampaign({
    userId: user.id as string,
    campaignId: campaignId as string,
    multiplier: multiplier as number,
  })
  res.status(httpStatus.CREATED).send(campaign)
})

const campaignStats = catchAsync(async (req, res) => {
  const user: User = req.user as User
  const { campaignId: campaignId } = req.params
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }
  const campaign = await campaignService.getCampaignStats({
    campaignId: campaignId,
    userId: user.id,
  })
  res.status(httpStatus.CREATED).send(campaign)
})

const getCampaigns = catchAsync(async (req, res) => {
  const user: User = req.user as User
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10 // Default 10 items per page

  const campaigns = await campaignService.getCampaigns({
    userId: user.id,
    page,
    limit,
  })

  res.status(httpStatus.OK).json(campaigns)
})

export default {
  createCampaign: createCampaign,
  campaignStats: campaignStats,
  getCampaigns: getCampaigns,
}
