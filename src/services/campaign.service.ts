import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import { Prisma as PrismaDB2 } from "../../generated/client2"
import { Prisma as PrismaDB1 } from "../../generated/client1"
import { User } from "../../generated/client1"
import { prismaDB1, prismaDB2 } from "../client"
import { mapCampaignToApi } from "../utils/fieldMapping"
import { buildCampaignScope, getAccessibleCampaignIds } from "../utils/accessControl"

const getCampaigns = async (payload: {
  user: User
  page: number
  limit: number
  search: string
  sortBy: keyof PrismaDB1.CampaignOrderByWithRelationInput
  sortDirection?: PrismaDB1.SortOrder
}) => {
  const scope = await buildCampaignScope(payload.user)
  const skip = (payload.page - 1) * payload.limit

  const whereCondition: PrismaDB1.CampaignWhereInput = {
    ...scope,
    ...(payload.search
      ? {
          OR: [
            { name: { contains: payload.search, mode: "insensitive" } },
            { subject: { contains: payload.search, mode: "insensitive" } },
            { templateName: { contains: payload.search, mode: "insensitive" } },
            { emailBody: { contains: payload.search, mode: "insensitive" } },
            { link: { contains: payload.search, mode: "insensitive" } },
            { campaignCode: { contains: payload.search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const orderByCondition: PrismaDB1.CampaignOrderByWithRelationInput = {
    [payload.sortBy]: payload.sortDirection,
  }

  const campaigns = await prismaDB1.campaign.findMany({
    where: whereCondition,
    skip,
    take: payload.limit,
    orderBy: orderByCondition,
  })

  const totalRecords = await prismaDB1.campaign.count({ where: whereCondition })
  const totalPages = Math.ceil(totalRecords / payload.limit)

  return {
    campaigns: campaigns.map(mapCampaignToApi),
    totalRecords,
    totalPages,
    currentPage: payload.page,
    pageLimit: payload.limit,
  }
}

const getCampaignsUpdateStatus = async (payload: {
  user: User
  page: number
  limit: number
  search: string
  sortBy: keyof PrismaDB2.CampaignUpdateHistoryOrderByWithRelationInput
  sortDirection?: PrismaDB2.SortOrder
  campaignId?: string
}) => {
  const accessibleCampaignIds = await getAccessibleCampaignIds(payload.user)
  const skip = (payload.page - 1) * payload.limit

  const orderByCondition: PrismaDB2.CampaignUpdateHistoryOrderByWithRelationInput = {
    [payload.sortBy]: payload.sortDirection,
  }

  const whereCondition: PrismaDB2.CampaignUpdateHistoryWhereInput = {
    deletedAt: null,
    ...(payload.search
      ? {
          OR: [{ name: { contains: payload.search, mode: "insensitive" } }],
        }
      : {}),
  }

  if (payload.campaignId) {
    if (accessibleCampaignIds && !accessibleCampaignIds.includes(payload.campaignId)) {
      throw new ApiError(httpStatus.FORBIDDEN, "Forbidden")
    }
    whereCondition.campaignId = payload.campaignId
  } else if (accessibleCampaignIds) {
    whereCondition.campaignId = { in: accessibleCampaignIds }
  }

  const campaigns = await prismaDB2.campaignUpdateHistory.findMany({
    where: whereCondition,
    skip,
    take: payload.limit,
    orderBy: orderByCondition,
  })

  const totalRecords = await prismaDB2.campaignUpdateHistory.count({ where: whereCondition })
  const totalPages = Math.ceil(totalRecords / payload.limit)

  return {
    campaigns,
    totalRecords,
    totalPages,
    currentPage: payload.page,
    pageLimit: payload.limit,
  }
}

export default {
  getCampaigns,
  getCampaignsUpdateStatus,
}
