import express from "express"
import validate from "../../middlewares/validate"
import { campaignValidation } from "../../validations"
import { campaignController } from "../../controllers"
import auth from "../../middlewares/auth"

const router = express.Router()

router
  .route("/add-stats")
  .post(auth(), validate(campaignValidation.addStats), campaignController.addStats)

router
  .route("/:campaignId/current-stats")
  .get(auth(), validate(campaignValidation.getCampaignStats), campaignController.getCurrentStats)

router
  .route("/updates")
  .get(
    auth("ADMIN"),
    validate(campaignValidation.getAllCampaignUpdates),
    campaignController.getCampaignsUpdateStatus,
  )

router
  .route("/")
  .get(auth("ADMIN"), validate(campaignValidation.getAllCampaign), campaignController.getCampaigns)

export default router
