import httpStatus from "http-status"
import { EmailStatus } from "../../generated/client1"
import { prismaDB1 as prisma, prismaDB2 } from "../client"
import ApiError from "../utils/ApiError"
import {
  Default_UserAgent,
  Default_UserIP,
  getRandomUserAgent,
  getRandomUserIP,
} from "../utils/UserAgents"
import {
  buildLimits,
  buildProjectedPools,
  computeDeltas,
  resolveTargets,
  validateStatsUpdate,
} from "../utils/statsValidation"
import emailProvisioningService from "./emailProvisioning.service"
import {
  CampaignStatsSnapshot,
  CampaignStatsTargets,
  EmailSource,
} from "../types/stats"

const BATCH_SIZE = 1000

const shuffle = <T>(items: T[]): T[] => [...items].sort(() => 0.5 - Math.random())

const pickRandomIds = (items: { id: string }[], count: number): string[] =>
  shuffle(items)
    .slice(0, count)
    .map((item) => item.id)

const countSent = async (campaignId: string): Promise<number> =>
  prisma.email.count({
    where: { campaignId, deletedAt: null },
  })

const countDelivered = async (campaignId: string): Promise<number> =>
  prisma.email.count({
    where: {
      campaignId,
      deletedAt: null,
      deliveryStatus: {
        in: [EmailStatus.DELIVERED, EmailStatus.OPENED, EmailStatus.CLICKED],
      },
    },
  })

const countUniqueOpens = async (campaignId: string): Promise<number> => {
  const grouped = await prisma.open.groupBy({
    by: ["emailId"],
    where: { campaignId },
  })
  return grouped.length
}

const countTotalOpens = async (campaignId: string): Promise<number> =>
  prisma.open.count({ where: { campaignId } })

const countUniqueClicks = async (campaignId: string): Promise<number> => {
  const grouped = await prisma.click.groupBy({
    by: ["emailId"],
    where: { campaignId },
  })
  return grouped.length
}

const countTotalClicks = async (campaignId: string): Promise<number> =>
  prisma.click.count({ where: { campaignId } })

const buildSnapshot = async (campaignId: string): Promise<CampaignStatsSnapshot> => ({
  sent: await countSent(campaignId),
  delivered: await countDelivered(campaignId),
  uniqueOpens: await countUniqueOpens(campaignId),
  totalOpens: await countTotalOpens(campaignId),
  uniqueClicks: await countUniqueClicks(campaignId),
  totalClicks: await countTotalClicks(campaignId),
})

const fetchDbPools = async (campaignId: string) => {
  const deliverableSent = await prisma.email.findMany({
    where: {
      campaignId,
      deletedAt: null,
      deliveryStatus: EmailStatus.SENT,
    },
    select: { id: true },
  })

  const openableDelivered = await prisma.email.findMany({
    where: {
      campaignId,
      deletedAt: null,
      deliveryStatus: {
        in: [EmailStatus.DELIVERED, EmailStatus.OPENED, EmailStatus.CLICKED],
      },
      openEvents: { none: {} },
    },
    select: { id: true },
  })

  const repeatableOpens = await prisma.email.findMany({
    where: {
      campaignId,
      deletedAt: null,
      openEvents: { some: {} },
    },
    select: { id: true },
  })

  const clickableOpened = await prisma.email.findMany({
    where: {
      campaignId,
      deletedAt: null,
      openEvents: { some: {} },
      clickEvents: { none: {} },
    },
    select: { id: true },
  })

  const repeatableClicks = await prisma.email.findMany({
    where: {
      campaignId,
      deletedAt: null,
      clickEvents: { some: {} },
    },
    select: { id: true },
  })

  return {
    deliverableSent: deliverableSent.length,
    openableDelivered: openableDelivered.length,
    repeatableOpens: repeatableOpens.length,
    clickableOpened: clickableOpened.length,
    repeatableClicks: repeatableClicks.length,
    deliverableSentRows: deliverableSent,
    openableDeliveredRows: openableDelivered,
    clickableOpenedRows: clickableOpened,
    repeatableOpensRows: repeatableOpens,
    repeatableClicksRows: repeatableClicks,
  }
}

const createEventsInBatches = async (
  createMany: (data: {
    emailId: string
    campaignId: string
    ipAddress: string
    userAgent: string
  }[]) => Promise<unknown>,
  events: {
    emailId: string
    campaignId: string
    ipAddress: string
    userAgent: string
  }[],
) => {
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    await createMany(events.slice(i, i + BATCH_SIZE))
  }
}

const getCurrentStats = async (campaignId: string) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    select: { id: true, name: true, hasCompleted: true },
  })

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  const snapshot = await buildSnapshot(campaignId)
  const dbPools = await fetchDbPools(campaignId)
  const limits = buildLimits(snapshot, {
    sentFromSource: 0,
    deliverableSent: dbPools.deliverableSent,
    openableDelivered: dbPools.openableDelivered,
    repeatableOpens: dbPools.repeatableOpens,
    clickableOpened: dbPools.clickableOpened,
    repeatableClicks: dbPools.repeatableClicks,
  })

  return {
    campaignId: campaign.id,
    name: campaign.name,
    hasCompleted: campaign.hasCompleted,
    ...snapshot,
    limits,
  }
}

const updateStats = async (payload: {
  campaignId: string
  targets: CampaignStatsTargets
  userId: string
  upload?: { buffer: Buffer; originalname: string }
  maxIncrease: number
  maxUploadEmails: number
}) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: payload.campaignId, deletedAt: null },
    select: { id: true, name: true, emailListId: true },
  })

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  const before = await buildSnapshot(payload.campaignId)
  const provisionalResolved = resolveTargets(before, payload.targets)
  const provisionalDeltas = computeDeltas(before, provisionalResolved)

  let emailSource: EmailSource = "none"
  const warnings: string[] = []

  let resolvedNewEmails: string[] = []
  if (provisionalDeltas.sent > 0) {
    const resolved = await emailProvisioningService.resolveNewEmails({
      campaignId: payload.campaignId,
      count: provisionalDeltas.sent,
      upload: payload.upload,
      maxUploadEmails: payload.maxUploadEmails,
    })
    resolvedNewEmails = resolved.emails
    emailSource = resolved.source
    warnings.push(...resolved.warnings)
  }

  const dbPools = await fetchDbPools(payload.campaignId)
  const projectedPools = buildProjectedPools(
    {
      deliverableSent: dbPools.deliverableSent,
      openableDelivered: dbPools.openableDelivered,
      repeatableOpens: dbPools.repeatableOpens,
      clickableOpened: dbPools.clickableOpened,
      repeatableClicks: dbPools.repeatableClicks,
    },
    provisionalDeltas,
    resolvedNewEmails.length,
  )

  const { deltas } = validateStatsUpdate({
    current: before,
    targets: payload.targets,
    pools: projectedPools,
    maxIncrease: payload.maxIncrease,
  })

  const repeatOpenDelta = deltas.totalOpens
  const repeatClickDelta = deltas.totalClicks

  await prisma.$transaction(async (tx) => {
    if (deltas.sent > 0) {
      await emailProvisioningService.provisionSentEmails(tx, {
        campaignId: campaign.id,
        campaignName: campaign.name,
        emailListId: campaign.emailListId,
        emails: resolvedNewEmails,
      })
    }

    if (deltas.delivered > 0) {
      const refreshedDeliverable = await tx.email.findMany({
        where: {
          campaignId: payload.campaignId,
          deletedAt: null,
          deliveryStatus: EmailStatus.SENT,
        },
        select: { id: true },
      })

      const deliveredIds = pickRandomIds(refreshedDeliverable, deltas.delivered)
      await tx.email.updateMany({
        where: { id: { in: deliveredIds } },
        data: {
          deliveryStatus: EmailStatus.DELIVERED,
          message: "Marked delivered via stats manager",
        },
      })
    }

    if (deltas.uniqueOpens > 0) {
      const openableRows = await tx.email.findMany({
        where: {
          campaignId: payload.campaignId,
          deletedAt: null,
          deliveryStatus: {
            in: [EmailStatus.DELIVERED, EmailStatus.OPENED, EmailStatus.CLICKED],
          },
          openEvents: { none: {} },
        },
        select: { id: true },
      })

      const uniqueOpenIds = pickRandomIds(openableRows, deltas.uniqueOpens)
      const uniqueOpenEvents = uniqueOpenIds.map((emailId) => ({
        emailId,
        campaignId: payload.campaignId,
        ipAddress: getRandomUserIP(),
        userAgent: getRandomUserAgent(),
      }))

      await createEventsInBatches(
        (data) => tx.open.createMany({ data }),
        uniqueOpenEvents,
      )

      await tx.email.updateMany({
        where: { id: { in: uniqueOpenIds } },
        data: { deliveryStatus: EmailStatus.OPENED },
      })
    }

    if (repeatOpenDelta > 0) {
      const openers = await tx.email.findMany({
        where: {
          campaignId: payload.campaignId,
          deletedAt: null,
          openEvents: { some: {} },
        },
        select: { id: true },
      })

      const repeatOpenEvents = Array.from({ length: repeatOpenDelta }, () => ({
        emailId: openers[Math.floor(Math.random() * openers.length)]!.id,
        campaignId: payload.campaignId,
        ipAddress: Default_UserIP,
        userAgent: Default_UserAgent,
      }))

      await createEventsInBatches(
        (data) => tx.open.createMany({ data }),
        repeatOpenEvents,
      )
    }

    if (deltas.uniqueClicks > 0) {
      const clickableRows = await tx.email.findMany({
        where: {
          campaignId: payload.campaignId,
          deletedAt: null,
          openEvents: { some: {} },
          clickEvents: { none: {} },
        },
        select: { id: true },
      })

      const uniqueClickIds = pickRandomIds(clickableRows, deltas.uniqueClicks)
      const uniqueClickEvents = uniqueClickIds.map((emailId) => ({
        emailId,
        campaignId: payload.campaignId,
        ipAddress: getRandomUserIP(),
        userAgent: getRandomUserAgent(),
      }))

      await createEventsInBatches(
        (data) => tx.click.createMany({ data }),
        uniqueClickEvents,
      )

      await tx.email.updateMany({
        where: { id: { in: uniqueClickIds } },
        data: { deliveryStatus: EmailStatus.CLICKED },
      })
    }

    if (repeatClickDelta > 0) {
      const clickers = await tx.email.findMany({
        where: {
          campaignId: payload.campaignId,
          deletedAt: null,
          clickEvents: { some: {} },
        },
        select: { id: true },
      })

      const repeatClickEvents = Array.from({ length: repeatClickDelta }, () => ({
        emailId: clickers[Math.floor(Math.random() * clickers.length)]!.id,
        campaignId: payload.campaignId,
        ipAddress: Default_UserIP,
        userAgent: Default_UserAgent,
      }))

      await createEventsInBatches(
        (data) => tx.click.createMany({ data }),
        repeatClickEvents,
      )
    }
  })

  const after = await buildSnapshot(payload.campaignId)

  await prismaDB2.campaignUpdateHistory.create({
    data: {
      campaignId: payload.campaignId,
      name: campaign.name,
      userId: payload.userId,
      sent: deltas.sent,
      delivered: deltas.delivered,
      totalOpens: deltas.totalOpens,
      uniqueOpens: deltas.uniqueOpens,
      totalClicks: deltas.totalClicks,
      uniqueClicks: deltas.uniqueClicks,
    },
  })

  return {
    before,
    after,
    applied: deltas,
    emailSource,
    warnings,
  }
}

export default {
  getCurrentStats,
  updateStats,
}
