import Joi from "joi"
import {
  allowedGetAllCampaignSortFields,
  allowedGetAllCampaignUpdatesSortFields,
} from "../types/campaign"
import { CampaignStatsTargets } from "../types/stats"

const optionalInteger = Joi.number().integer().min(0).optional()

const updateStatsBodySchema = Joi.object({
  campaignId: Joi.string().guid({ version: "uuidv4" }).required(),
  sent: optionalInteger,
  delivered: optionalInteger,
  uniqueOpens: optionalInteger,
  totalOpens: optionalInteger,
  uniqueClicks: optionalInteger,
  totalClicks: optionalInteger,
}).or("sent", "delivered", "uniqueOpens", "totalOpens", "uniqueClicks", "totalClicks")

const getCampaignStats = {
  params: Joi.object().keys({
    campaignId: Joi.string().required(),
  }),
}

const getAllCampaignUpdates = {
  query: Joi.object().keys({
    campaignId: Joi.string().guid().optional(),
    limit: Joi.number().integer().positive().default(10),
    page: Joi.number().integer().positive().default(1),
    search: Joi.string().allow("").optional(),
    sortBy: Joi.string()
      .valid(...allowedGetAllCampaignUpdatesSortFields)
      .default("createdAt"),
    sortDirection: Joi.string().valid("asc", "desc").default("desc"),
  }),
}

const getAllCampaign = {
  query: Joi.object().keys({
    limit: Joi.number().integer().positive().default(10),
    page: Joi.number().integer().positive().default(1),
    search: Joi.string().allow("").optional(),
    sortBy: Joi.string()
      .valid(...allowedGetAllCampaignSortFields)
      .default("createdAt"),
    sortDirection: Joi.string().valid("asc", "desc").default("desc"),
  }),
}

const parseOptionalInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export const parseUpdateStatsBody = (body: Record<string, unknown>): {
  campaignId: string
  targets: CampaignStatsTargets
} => {
  const normalized = {
    campaignId: body.campaignId,
    sent: parseOptionalInteger(body.sent),
    delivered: parseOptionalInteger(body.delivered),
    uniqueOpens: parseOptionalInteger(body.uniqueOpens),
    totalOpens: parseOptionalInteger(body.totalOpens),
    uniqueClicks: parseOptionalInteger(body.uniqueClicks),
    totalClicks: parseOptionalInteger(body.totalClicks),
  }

  const { value, error } = updateStatsBodySchema.validate(normalized, {
    abortEarly: false,
  })

  if (error) {
    throw error
  }

  const { campaignId, ...targets } = value
  return { campaignId, targets }
}

export default {
  getCampaignStats,
  getAllCampaignUpdates,
  getAllCampaign,
  updateStatsBodySchema,
}
