import Joi from "joi"

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

export default {
  getCampaignStats: getCampaignStats,
  addStats,
}
