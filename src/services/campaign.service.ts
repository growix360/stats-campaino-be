import { prismaDB1, prismaDB2 } from "../client"

const getCampaigns = async (payload: { userId: string; page: number; limit: number }) => {
  const user = await prismaDB1.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error("User not found")
  }

  const whereCondition: { createdBy?: string } = {}

  const skip = (payload.page - 1) * payload.limit

  const campaigns = await prismaDB1.campaign.findMany({
    where: whereCondition,
    skip,
    take: payload.limit,
  })

  const totalRecords = await prismaDB1.campaign.count({ where: whereCondition })
  const totalPages = Math.ceil(totalRecords / payload.limit)

  return {
    campaigns,
    totalRecords,
    totalPages,
    currentPage: payload.page,
  }
}

const getCampaignsUpdateStatus = async (payload: {
  userId: string
  page: number
  limit: number
}) => {
  const user = await prismaDB1.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error("User not found")
  }

  const whereCondition = {}

  const skip = (payload.page - 1) * payload.limit

  const campaigns = await prismaDB2.campaignUpdateHistory.findMany({
    where: whereCondition,
    skip,
    take: payload.limit,
  })

  const totalRecords = await prismaDB2.campaignUpdateHistory.count({ where: whereCondition })
  const totalPages = Math.ceil(totalRecords / payload.limit)

  return {
    campaigns,
    totalRecords,
    totalPages,
    currentPage: payload.page,
  }
}

export default {
  getCampaigns,
  getCampaignsUpdateStatus,
}
