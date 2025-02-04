import Joi from "joi"

const createCampaign = {
  body: Joi.object().keys({
    campaignId: Joi.string().required(),
    multiplier: Joi.number().required(),
  }),
}

const getCampaignStats = {
  params: Joi.object().keys({
    campaignId: Joi.string().required(),
  }),
}

export default {
  createCampaign: createCampaign,
  getCampaignStats: getCampaignStats,
}
