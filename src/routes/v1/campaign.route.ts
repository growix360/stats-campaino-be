import express from "express"
import validate from "../../middlewares/validate"
import { campaignValidation } from "../../validations"
import { campaignController } from "../../controllers"
import auth from "../../middlewares/auth"
import { statsUpload } from "../../utils/fileUpload"
import { Role } from "../../../generated/client1"

const router = express.Router()

const privilegedRoles = [Role.ADMIN, Role.MANAGER]

router
  .route("/update-stats")
  .post(
    auth(...privilegedRoles),
    statsUpload.single("file"),
    campaignController.updateStats,
  )

router
  .route("/:campaignId/current-stats")
  .get(
    auth(...privilegedRoles),
    validate(campaignValidation.getCampaignStats),
    campaignController.getCurrentStats,
  )

router
  .route("/updates")
  .get(
    auth(...privilegedRoles),
    validate(campaignValidation.getAllCampaignUpdates),
    campaignController.getCampaignsUpdateStatus,
  )

router
  .route("/")
  .get(
    auth(...privilegedRoles),
    validate(campaignValidation.getAllCampaign),
    campaignController.getCampaigns,
  )

export default router
