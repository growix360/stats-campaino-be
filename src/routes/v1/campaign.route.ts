import express from "express"
import validate from "../../middlewares/validate"
import { campaignValidation } from "../../validations"
import { campaignController } from "../../controllers"
import auth from "../../middlewares/auth"
import { statsUpload } from "../../utils/fileUpload"
import { Role } from "../../../generated/client1"

const router = express.Router()

router
  .route("/update-stats")
  .post(
    auth(Role.ADMIN, Role.MANAGER),
    statsUpload.single("file"),
    campaignController.updateStats,
  )

router
  .route("/:campaignId/current-stats")
  .get(auth(), validate(campaignValidation.getCampaignStats), campaignController.getCurrentStats)

router
  .route("/updates")
  .get(
    auth(Role.ADMIN),
    validate(campaignValidation.getAllCampaignUpdates),
    campaignController.getCampaignsUpdateStatus,
  )

router
  .route("/")
  .get(auth(Role.ADMIN), validate(campaignValidation.getAllCampaign), campaignController.getCampaigns)

export default router
