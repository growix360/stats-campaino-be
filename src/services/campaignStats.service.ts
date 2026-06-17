import { EmailStatus } from "../../generated/client1"
import { prismaDB1 as prisma, prismaDB2 } from "../client"
import {
  Default_UserAgent,
  Default_UserIP,
  getRandomUserAgent,
  getRandomUserIP,
} from "../utils/UserAgents"

const addStatsEvents = async (payload: {
  campaignId: string
  opens: number
  uniqueOpens: number
  clicks: number
  uniqueClicks: number
  delivered: number
}) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } })
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    // Fetch all campaign emails
    const allEmails = await prisma.email.findMany({
      where: { campaignId: payload.campaignId },
      select: { id: true },
    })

    if (allEmails.length === 0) {
      throw new Error(
        `No processed emails found for campaign ${payload.campaignId}. Cannot add stats.`,
      )
    }
    // Get emails that haven't been opened yet (for unique opens)
    const emailsWithoutOpens = await prisma.email.findMany({
      where: { campaignId: payload.campaignId, openEvents: { none: {} } },
      select: { id: true },
    })

    // Get emails that haven't been clicked yet (for unique clicks)
    const emailsWithoutClicks = await prisma.email.findMany({
      where: {
        campaignId: payload.campaignId,
        clickEvents: { none: {} },
      },
      select: { id: true },
    })

    const emailsNotDelivered = await prisma.email.findMany({
      where: {
        campaignId: payload.campaignId,
        deliveryStatus: { in: [EmailStatus.SENT, EmailStatus.UNSENT] },
      },
      select: { id: true },
    })

    const selectedForDelivered = emailsNotDelivered
      .sort(() => 0.5 - Math.random())
      .slice(0, payload.delivered)

    // Select random emails for unique opens and unique clicks
    const selectedForUniqueOpens = emailsWithoutOpens
      .sort(() => 0.5 - Math.random())
      .slice(0, payload.uniqueOpens)

    const selectedForUniqueClicks = emailsWithoutClicks
      .sort(() => 0.5 - Math.random())
      .slice(0, payload.uniqueClicks)

    // Generate unique open events
    const uniqueOpenEvents = selectedForUniqueOpens.map((email) => ({
      emailId: email.id,
      campaignId: payload.campaignId,
      ipAddress: getRandomUserIP(),
      userAgent: getRandomUserAgent(),
    }))

    // Generate additional open events (randomly assigned to any email)
    const allOpenEvents = Array.from({ length: payload.opens }, () => ({
      emailId: allEmails[Math.floor(Math.random() * allEmails.length)]?.id, // Randomly pick any email
      campaignId: payload.campaignId,
      ipAddress: Default_UserIP,
      userAgent: Default_UserAgent,
    })).filter((event) => event.emailId) // Remove any undefined values

    // Generate unique click events
    const uniqueClickEvents = selectedForUniqueClicks.map((email) => ({
      emailId: email.id,
      campaignId: payload.campaignId,
      ipAddress: getRandomUserIP(),
      userAgent: getRandomUserAgent(),
    }))
    console.log("\n🚀 ~\n uniqueClickEvents:\t", uniqueClickEvents)

    // Generate additional click events (randomly assigned to any email)
    const allClickEvents = Array.from({ length: payload.clicks }, () => ({
      emailId: allEmails[Math.floor(Math.random() * allEmails.length)]?.id, // Randomly pick any email
      campaignId: payload.campaignId,
      ipAddress: Default_UserIP,
      userAgent: Default_UserAgent,
    })).filter((event) => event.emailId)

    // Insert events into the database
    const transactionOps = [
      prisma.open.createMany({ data: uniqueOpenEvents }),
      prisma.open.createMany({ data: allOpenEvents }),
      prisma.click.createMany({ data: uniqueClickEvents }),
      prisma.click.createMany({ data: allClickEvents }),
    ]

    if (selectedForDelivered.length > 0) {
      transactionOps.push(
        prisma.email.updateMany({
          where: { id: { in: selectedForDelivered.map((email) => email.id) } },
          data: {
            deliveryStatus: EmailStatus.DELIVERED,
            message: "Marked delivered via stats manager",
          },
        }),
      )
    }

    await prisma.$transaction(transactionOps)

    console.log(
      `Added ${selectedForDelivered.length} delivered, ${uniqueOpenEvents.length} unique opens, ${allOpenEvents.length} total opens, ${uniqueClickEvents.length} unique clicks, and ${allClickEvents.length} total clicks to campaign ${payload.campaignId}`,
    )

    await prismaDB2.campaignUpdateHistory.create({
      data: {
        name: campaign.name,
        campaignId: payload.campaignId,
        delivered: selectedForDelivered.length,
        opens: payload.opens,
        uniqueOpens: payload.uniqueOpens,
        clicks: payload.clicks,
        uniqueClicks: payload.uniqueClicks,
        createdAt: new Date(),
      },
    })

    return {
      delivered: selectedForDelivered.length,
      uniqueOpens: uniqueOpenEvents.length,
      totalOpens: allOpenEvents.length,
      uniqueClicks: uniqueClickEvents.length,
      totalClicks: allClickEvents.length,
    }
  } catch (error) {
    console.error("Error adding events:", error)
    throw error
  }
}

const getCurrentStats = async (campaignId: string) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    select: { id: true, name: true, hasCompleted: true },
  })

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  const totalEmails = await prisma.email.count({
    where: { campaignId },
  })

  const totalOpens = await prisma.open.count({
    where: { campaignId },
  })

  const uniqueOpens = await prisma.open.groupBy({
    by: ["emailId"],
    where: { campaignId },
  })

  const totalClicks = await prisma.click.count({
    where: { campaignId },
  })

  const uniqueClicks = await prisma.click.groupBy({
    by: ["emailId"],
    where: { campaignId },
  })

  const totalDelivered = await prisma.email.count({
    where: { campaignId, deliveryStatus: EmailStatus.DELIVERED },
  })

  return {
    campaignId: campaign.id,
    name: campaign.name,
    hasCompleted: campaign.hasCompleted,
    totalEmails,
    totalDelivered,
    totalOpens,
    uniqueOpens: uniqueOpens.length,
    totalClicks,
    uniqueClicks: uniqueClicks.length,
  }
}

export default { addStatsEvents, getCurrentStats }

