import express from "express"
import validate from "../../middlewares/validate"
import { campaignValidation } from "../../validations"
import { campaignController } from "../../controllers"
import auth from "../../middlewares/auth"
import { uploadStatsFile } from "../../utils/fileUpload"
import { statsLimiter } from "../../middlewares/rateLimiter"
import config from "../../config/config"
import { Role } from "../../../generated/client1"

const router = express.Router()

const privilegedRoles = [Role.ADMIN, Role.MANAGER]

const updateStatsMiddleware = [
  auth(...privilegedRoles),
  ...(config.env === "production" ? [statsLimiter] : []),
  uploadStatsFile,
  campaignController.updateStats,
]

router.route("/update-stats").post(...updateStatsMiddleware)

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
