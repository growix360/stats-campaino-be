import { prismaDB1, prismaDB2 } from "../client"

const createCampaign = async (payload: {
  userId: string
  campaignId: string
  multiplier: number
}): Promise<any> => {
  const existingCampaign = await prismaDB1.campaign.findUnique({
    where: { id: payload.campaignId },
  })
  if (!existingCampaign) {
    throw new Error("Campaign not found")
  }

  const newCampaign = await prismaDB2.campaign.create({
    data: {
      name: existingCampaign.name,
      emailBody: existingCampaign.emailBody,
      templateName: existingCampaign.templateName,
      createdBy: existingCampaign.createdBy,
      subject: existingCampaign.subject,
      campaignId: existingCampaign.id,
      statMultiplier: payload.multiplier,
    },
  })

  return newCampaign
}

const getCampaignStats = async (payload: { campaignId: string; userId: string }) => {
  // const user = await prismaDB1.user.findUnique({ where: { id: payload.userId } })
  // if (!user) {
  //   throw new Error("User not found")
  // }
  // console.log("Getting campaign stats for user:", user.id)
  // console.log("Getting campaign stats for user:", { payload })

  // if (user.role !== "ADMIN") {
  //   const campaign = await prismaDB1.campaign.findUnique({
  //     where: { id: payload.campaignId },
  //     select: { createdBy: true },
  //   })
  //   console.log("Getting campaign stats for user:", campaign)

  //   if (!campaign) {
  //     throw new Error("Campaign not found")
  //   }

  //   if (campaign.createdBy !== payload.userId) {
  //     throw new Error("You are not authorized to view this campaign's stats")
  //   }
  // }

  const campaign = await prismaDB2.campaign.findUnique({ where: { id: payload.campaignId } })
  if (!campaign) {
    throw new Error("Campaign not found")
  }
  const stats = await prismaDB1.email.aggregate({
    where: {
      campaignId: campaign.campaignId,
    },
    _sum: {
      opens: true,
      bounce: true,
      clicks: true,
      uniqueOpen: true,
      delivery: true,
      uniqueClick: true,
    },
    _count: {
      id: true,
    },
  })

  return {
    totalEmails: stats._count.id,
    totalOpens: (stats._sum.opens || 0) * campaign.statMultiplier,
    totalBounces: stats._sum.bounce || 0,
    totalClicks: (stats._sum.clicks || 0) * campaign.statMultiplier,
    totalUniqueOpens: stats._sum.uniqueOpen || 0,
    totalDelivery: stats._sum.delivery || 0,
    totalUniqueClicks: stats._sum.uniqueClick || 0,
  }
}

const getCampaigns = async (payload: { userId: string; page: number; limit: number }) => {
  // const user = await prismaDB2.user.findUnique({ where: { id: payload.userId } })
  // if (!user) {
  //   throw new Error("User not found")
  // }

  const whereCondition: { createdBy?: string } = {}

  // if (user.role !== "ADMIN") {
  //   whereCondition.createdBy = payload.userId
  // }

  const skip = (payload.page - 1) * payload.limit

  const campaigns = await prismaDB2.campaign.findMany({
    where: whereCondition,
    skip,
    take: payload.limit,
  })

  const totalRecords = await prismaDB2.campaign.count({ where: whereCondition })
  const totalPages = Math.ceil(totalRecords / payload.limit)

  return {
    campaigns,
    totalRecords,
    totalPages,
    currentPage: payload.page,
  }
}

export default {
  createCampaign,
  getCampaignStats,
  getCampaigns,
}
