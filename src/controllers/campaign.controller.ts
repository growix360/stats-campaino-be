import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import catchAsync from "../utils/catchAsync"
import { campaignService } from "../services"
import { User } from "../../generated/client1"
import { campaignStatsService } from "../services"
import { Prisma as PrismaDB2 } from "../../generated/client2"
import { Prisma as PrismaDB1 } from "../../generated/client1"

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

export default {
  getCampaigns: getCampaigns,
  addStats,
  getCampaignsUpdateStatus,
}
