import httpStatus from "http-status"
import { EmailStatus, Prisma } from "../../generated/client1"
import { prismaDB1 as prisma } from "../client"
import ApiError from "../utils/ApiError"
import { pickRandomEmails } from "../utils/customersCsv"
import { dedupeAgainstExisting, parseEmailFile } from "../utils/emailFileParsing"
import { EmailSource } from "../types/stats"

const BATCH_SIZE = 1000

export const resolveNewEmails = async (payload: {
  campaignId: string
  count: number
  upload?: { buffer: Buffer; originalname: string }
  maxUploadEmails: number
}): Promise<{ emails: string[]; warnings: string[]; source: EmailSource }> => {
  if (payload.count <= 0) {
    return { emails: [], warnings: [], source: "none" }
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: payload.campaignId, deletedAt: null },
    include: { emailList: true },
  })

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  const existingEmails = await prisma.email.findMany({
    where: { campaignId: payload.campaignId, deletedAt: null },
    select: { email: true },
  })

  const exclude = new Set<string>(
    [
      ...existingEmails.map((row) => row.email.toLowerCase()),
      ...(campaign.emailList?.emails ?? []).map((email) => email.toLowerCase()),
    ],
  )

  const warnings: string[] = []
  let candidates: string[] = []
  let source: EmailSource = "none"

  if (payload.upload) {
    const parsed = parseEmailFile(
      payload.upload.buffer.toString("utf8"),
      payload.upload.originalname,
      payload.maxUploadEmails,
    )

    if (parsed.invalidLines > 0) {
      warnings.push(`Skipped ${parsed.invalidLines} invalid line(s) in uploaded file`)
    }
    if (parsed.duplicateLines > 0) {
      warnings.push(`Skipped ${parsed.duplicateLines} duplicate line(s) in uploaded file`)
    }

    candidates = parsed.validEmails
    source = "upload"
  } else {
    candidates = pickRandomEmails(payload.count * 3, exclude)
    source = "default_csv"
  }

  const { emails, skippedDuplicates } = dedupeAgainstExisting(candidates, exclude)

  if (skippedDuplicates > 0) {
    warnings.push(`Skipped ${skippedDuplicates} duplicate email(s) already in campaign or list`)
  }

  if (emails.length < payload.count) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient emails available: need ${payload.count}, resolved ${emails.length}`,
    )
  }

  return {
    emails: emails.slice(0, payload.count),
    warnings,
    source,
  }
}

export const provisionSentEmails = async (
  tx: Prisma.TransactionClient,
  payload: {
    campaignId: string
    campaignName: string
    emailListId: string | null
    emails: string[]
  },
): Promise<string | null> => {
  if (payload.emails.length === 0) {
    return payload.emailListId
  }

  for (let i = 0; i < payload.emails.length; i += BATCH_SIZE) {
    const batch = payload.emails.slice(i, i + BATCH_SIZE)
    await tx.email.createMany({
      data: batch.map((email) => ({
        email,
        campaignId: payload.campaignId,
        deliveryStatus: EmailStatus.SENT,
        message: "Added via stats manager",
      })),
    })
  }

  let emailListId = payload.emailListId

  if (!emailListId) {
    const createdList = await tx.emailList.create({
      data: {
        name: `${payload.campaignName} - stats`,
        emails: payload.emails,
        totalRecords: payload.emails.length,
        insertedRecords: payload.emails.length,
        updatedRecords: 0,
        invalidRecords: 0,
        isUsed: true,
      },
    })
    emailListId = createdList.id

    await tx.campaign.update({
      where: { id: payload.campaignId },
      data: { emailListId: createdList.id },
    })

    return emailListId
  }

  const emailList = await tx.emailList.findFirst({
    where: { id: emailListId, deletedAt: null },
  })

  if (!emailList) {
    throw new ApiError(httpStatus.NOT_FOUND, "Campaign email list not found")
  }

  await tx.emailList.update({
    where: { id: emailListId },
    data: {
      emails: [...emailList.emails, ...payload.emails],
      totalRecords: (emailList.totalRecords ?? emailList.emails.length) + payload.emails.length,
      insertedRecords:
        (emailList.insertedRecords ?? emailList.emails.length) + payload.emails.length,
    },
  })

  return emailListId
}

export default {
  resolveNewEmails,
  provisionSentEmails,
}
