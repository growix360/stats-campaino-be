import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import catchAsync from "../utils/catchAsync"
import { campaignService } from "../services"
import { User } from "../../generated/client1"
import { campaignStatsService } from "../services"

const addStats = catchAsync(async (req, res) => {
  const user: User = req.user as User
  const { campaignId, opens, uniqueOpens, clicks, uniqueClicks } = req.body
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }
  const campaign = await campaignStatsService.addStatsEvents({
    campaignId: campaignId,
    opens: opens,
    uniqueOpens: uniqueOpens,
    clicks: clicks,
    uniqueClicks: uniqueClicks,
  })
  return res.status(httpStatus.CREATED).send(campaign)
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

  return res.status(httpStatus.OK).json(campaigns)
})

const getCampaignsUpdateStatus = catchAsync(async (req, res) => {
  const user: User = req.user as User
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated")
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10 // Default 10 items per page

  const campaigns = await campaignService.getCampaignsUpdateStatus({
    userId: user.id,
    page,
    limit,
  })

  return res.status(httpStatus.OK).json(campaigns)
})

export default {
  getCampaigns: getCampaigns,
  addStats,
  getCampaignsUpdateStatus,
}
