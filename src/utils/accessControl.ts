import httpStatus from "http-status"
import { Prisma as PrismaDB1 } from "../../generated/client1"
import { Role, User } from "../../generated/client1"
import { prismaDB1 as prisma } from "../client"
import ApiError from "./ApiError"

export const isAdmin = (user: Pick<User, "role">): boolean => user.role === Role.ADMIN

export const isManager = (user: Pick<User, "role">): boolean => user.role === Role.MANAGER

export const assertAuthenticatedRole = (user: Pick<User, "role">): void => {
  if (user.role === Role.USER) {
    throw new ApiError(httpStatus.FORBIDDEN, "Forbidden")
  }
}

export const getAssignedDomainIds = async (userId: string): Promise<string[]> => {
  const assignments = await prisma.userDomain.findMany({
    where: { userId },
    select: { domainId: true },
  })
  return assignments.map((row) => row.domainId)
}

export const buildCampaignScope = async (
  user: Pick<User, "id" | "role">,
): Promise<PrismaDB1.CampaignWhereInput> => {
  assertAuthenticatedRole(user)

  if (isAdmin(user)) {
    return { deletedAt: null }
  }

  const domainIds = await getAssignedDomainIds(user.id)
  if (domainIds.length === 0) {
    return { deletedAt: null, id: { in: [] } }
  }

  return {
    deletedAt: null,
    domainId: { in: domainIds },
  }
}

export const assertCampaignAccess = async (
  user: Pick<User, "id" | "role">,
  campaignId: string,
): Promise<{
  id: string
  name: string
  domainId: string | null
  emailListId: string | null
  hasCompleted: boolean
}> => {
  assertAuthenticatedRole(user)

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    select: { id: true, name: true, domainId: true, emailListId: true, hasCompleted: true },
  })

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  if (isAdmin(user)) {
    return campaign
  }

  if (!campaign.domainId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Forbidden")
  }

  const domainIds = await getAssignedDomainIds(user.id)
  if (!domainIds.includes(campaign.domainId)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Forbidden")
  }

  return campaign
}

export const getAccessibleCampaignIds = async (user: Pick<User, "id" | "role">): Promise<string[] | null> => {
  assertAuthenticatedRole(user)

  if (isAdmin(user)) {
    return null
  }

  const scope = await buildCampaignScope(user)
  const campaigns = await prisma.campaign.findMany({
    where: scope,
    select: { id: true },
  })

  return campaigns.map((campaign) => campaign.id)
}

export default {
  isAdmin,
  isManager,
  assertAuthenticatedRole,
  getAssignedDomainIds,
  buildCampaignScope,
  assertCampaignAccess,
  getAccessibleCampaignIds,
}
