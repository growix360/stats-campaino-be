import express from "express"
import validate from "../../middlewares/validate"
import { campaignValidation } from "../../validations"
import { campaignController } from "../../controllers"
import auth from "../../middlewares/auth"

const router = express.Router()

router
  .route("/add-stats")
  .post(auth(), validate(campaignValidation.addStats), campaignController.addStats)

router.route("/updates").get(auth("ADMIN"), campaignController.getCampaignsUpdateStatus)

router.route("/").get(auth("ADMIN"), campaignController.getCampaigns)

export default router
