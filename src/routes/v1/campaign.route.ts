import express from "express"
import validate from "../../middlewares/validate"
import { campaignValidation } from "../../validations"
import { campaignController } from "../../controllers"
import auth from "../../middlewares/auth"

const router = express.Router()

router
  .route("/stats/:campaignId")
  .get(
    auth("ADMIN"),
    validate(campaignValidation.getCampaignStats),
    campaignController.campaignStats
  )
router
  .route("/")
  .post(
    auth("ADMIN"),
    validate(campaignValidation.createCampaign),
    campaignController.createCampaign
  )
  .get(auth("ADMIN"), campaignController.getCampaigns)

export default router
