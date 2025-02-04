import { prismaDB2 } from "../client"
import { nanoid } from "nanoid"
import ApiError from "../utils/ApiError"
import { v4 as uuidv4 } from "uuid"

const BASE_URL = process.env.BASE_URL || "http://localhost:3001/v1/link"

const createShortUrl = async (originalUrl: string) => {
  const shortCode = nanoid(8)

  const newLink = await prismaDB2.links.create({
    data: {
      originalUrl,
      shortUrl: `${BASE_URL}/${shortCode}`,
    },
  })

  return newLink
}

const getOriginalUrl = async (shortCode: string) => {
  const link = await prismaDB2.links.findFirst({
    where: { shortUrl: `${BASE_URL}/${shortCode}`, deletedAt: null },
  })

  console.log("\n🚀 ~\n file: links.service.ts:26 ~\n getOriginalUrl ~\n link:\t", link)

  if (!link) throw new ApiError(404, "Short URL not found")

  await prismaDB2.links.update({
    where: { id: link.id },
    data: { clicks: { increment: 1 } },
  })

  const uuid = uuidv4()
  const originalUrlWithUUID = `${link.originalUrl}?uuid=${uuid}`

  return originalUrlWithUUID
}

const getAllShortUrls = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit

  const [links, total] = await Promise.all([
    prismaDB2.links.findMany({
      where: { deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prismaDB2.links.count({ where: { deletedAt: null } }),
  ])

  return {
    links,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

const deleteShortUrl = async (shortCode: string) => {
  const link = await prismaDB2.links.findFirst({
    where: { shortUrl: `${BASE_URL}/${shortCode}`, deletedAt: null },
  })

  if (!link) throw new ApiError(404, "Short URL not found")

  await prismaDB2.links.update({
    where: { id: link.id },
    data: { deletedAt: new Date() },
  })

  return { message: "Short URL deleted successfully" }
}

export default {
  createShortUrl,
  getOriginalUrl,
  getAllShortUrls,
  deleteShortUrl,
}
