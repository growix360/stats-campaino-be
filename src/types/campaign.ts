import { Prisma as PrismaDB1 } from "../../generated/client1"
import { Prisma as PrismaDB2 } from "../../generated/client2"

export const allowedGetAllCampaignUpdatesSortFields: (keyof PrismaDB2.CampaignUpdateHistoryOrderByWithRelationInput)[] =
  [
    "createdAt",
    "updatedAt",
    "sent",
    "delivered",
    "totalOpens",
    "uniqueOpens",
    "totalClicks",
    "uniqueClicks",
  ]

export const allowedGetAllCampaignSortFields: (keyof PrismaDB1.CampaignOrderByWithRelationInput)[] =
  ["createdAt", "updatedAt", "name", "subject", "templateName"]

