import { prismaDB1 as prisma, prismaDB2 } from "../client"
import { Default_UserAgent, getRandomUserAgent } from "../utils/UserAgents"

const addStatsEvents = async (payload: {
  campaignId: string
  opens: number
  uniqueOpens: number
  clicks: number
  uniqueClicks: number
}) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } })
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    // Fetch all campaign emails
    const allEmails = await prisma.email.findMany({
      where: { campaignId: payload.campaignId, messageId: { not: null } },
      select: { id: true },
    })

    if (allEmails.length === 0) {
      throw new Error(
        `No processed emails found for campaign ${payload.campaignId}. Cannot add stats.`,
      )
    }
    // Get emails that haven't been opened yet (for unique opens)
    const emailsWithoutOpens = await prisma.email.findMany({
      where: { campaignId: payload.campaignId, messageId: { not: null }, openEvents: { none: {} } },
      select: { id: true },
    })

    // Get emails that haven't been clicked yet (for unique clicks)
    const emailsWithoutClicks = await prisma.email.findMany({
      where: {
        campaignId: payload.campaignId,
        messageId: { not: null },
        clickEvents: { none: {} },
      },
      select: { id: true },
    })

    // Select random emails for unique opens and unique clicks
    const selectedForUniqueOpens = emailsWithoutOpens
      .sort(() => 0.5 - Math.random())
      .slice(0, payload.uniqueOpens)

    const selectedForUniqueClicks = emailsWithoutClicks
      .sort(() => 0.5 - Math.random())
      .slice(0, payload.uniqueClicks)

    // Generate fake unique open events
    const uniqueOpenEvents = selectedForUniqueOpens.map((email) => ({
      emailId: email.id,
      campaignId: payload.campaignId,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: getRandomUserAgent(),
    }))

    // Generate additional fake open events (randomly assigned to any email)
    const allOpenEvents = Array.from({ length: payload.opens }, () => ({
      emailId: allEmails[Math.floor(Math.random() * allEmails.length)]?.id, // Randomly pick any email
      campaignId: payload.campaignId,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: Default_UserAgent,
    })).filter((event) => event.emailId) // Remove any undefined values

    // Generate fake unique click events
    const uniqueClickEvents = selectedForUniqueClicks.map((email) => ({
      emailId: email.id,
      campaignId: payload.campaignId,
      ipAddress: `10.0.0.${Math.floor(Math.random() * 255)}`,
      userAgent: getRandomUserAgent(),
    }))

    // Generate additional fake click events (randomly assigned to any email)
    const allClickEvents = Array.from({ length: payload.clicks }, () => ({
      emailId: allEmails[Math.floor(Math.random() * allEmails.length)]?.id, // Randomly pick any email
      campaignId: payload.campaignId,
      ipAddress: `10.0.0.${Math.floor(Math.random() * 255)}`,
      userAgent: Default_UserAgent,
    })).filter((event) => event.emailId)

    // Insert fake events into the database
    await prisma.$transaction([
      prisma.open.createMany({ data: uniqueOpenEvents }),
      prisma.open.createMany({ data: allOpenEvents }),
      prisma.click.createMany({ data: uniqueClickEvents }),
      prisma.click.createMany({ data: allClickEvents }),
    ])

    console.log(
      `Added ${uniqueOpenEvents.length} unique opens, ${allOpenEvents.length} total opens, ${uniqueClickEvents.length} unique clicks, and ${allClickEvents.length} total clicks to campaign ${payload.campaignId}`,
    )

    await prismaDB2.campaignUpdateHistory.create({
      data: {
        name: campaign.name,
        campaignId: payload.campaignId,
        opens: payload.opens,
        uniqueOpens: payload.uniqueOpens,
        clicks: payload.clicks,
        uniqueClicks: payload.uniqueClicks,
        createdAt: new Date(),
      },
    })

    return {
      uniqueOpens: uniqueOpenEvents.length,
      totalOpens: allOpenEvents.length,
      uniqueClicks: uniqueClickEvents.length,
      totalClicks: allClickEvents.length,
    }
  } catch (error) {
    console.error("Error adding fake events:", error)
    throw error
  }
}

export default { addStatsEvents }

