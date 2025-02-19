import { Prisma as PrismaDB2 } from "../../generated/client2"
import { Prisma as PrismaDB1 } from "../../generated/client1"
import { prismaDB1, prismaDB2 } from "../client"

const getCampaigns = async (payload: {
  userId: string
  page: number
  limit: number
  search: string
  sortBy: keyof PrismaDB1.CampaignOrderByWithRelationInput
  sortDirection?: PrismaDB1.SortOrder
}) => {
  const user = await prismaDB1.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error("User not found")
  }

  const skip = (payload.page - 1) * payload.limit

  const whereCondition: PrismaDB1.CampaignWhereInput = {
    deletedAt: null,
    ...(payload.search
      ? {
          OR: [
            { name: { contains: payload.search, mode: "insensitive" } },
            { subject: { contains: payload.search, mode: "insensitive" } },
            { templateName: { contains: payload.search, mode: "insensitive" } },
            { emailBody: { contains: payload.search, mode: "insensitive" } },
            { link: { contains: payload.search, mode: "insensitive" } },
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
    campaigns,
    totalRecords,
    totalPages,
    currentPage: payload.page,
    pageLimit: payload.limit,
  }
}

const getCampaignsUpdateStatus = async (payload: {
  userId: string
  page: number
  limit: number
  search: string
  sortBy: keyof PrismaDB2.CampaignUpdateHistoryOrderByWithRelationInput
  sortDirection?: PrismaDB2.SortOrder
}) => {
  const user = await prismaDB1.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error("User not found")
  }

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
