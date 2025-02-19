import Joi from "joi"
import {
  allowedGetAllCampaignSortFields,
  allowedGetAllCampaignUpdatesSortFields,
} from "../types/campaign"

const getCampaignStats = {
  params: Joi.object().keys({
    campaignId: Joi.string().required(),
  }),
}
const addStats = {
  body: Joi.object().keys({
    campaignId: Joi.string().required(),
    opens: Joi.number().required(),
    uniqueOpens: Joi.number().required(),
    clicks: Joi.number().required(),
    uniqueClicks: Joi.number().required(),
  }),
}

const getAllCampaignUpdates = {
  query: Joi.object().keys({
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

export default {
  getCampaignStats: getCampaignStats,
  addStats,
  getAllCampaignUpdates,
  getAllCampaign,
}
