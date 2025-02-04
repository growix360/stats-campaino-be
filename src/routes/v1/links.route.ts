import express from "express"
import { linksController } from "../../controllers"
import auth from "../../middlewares/auth"
import validate from "../../middlewares/validate"
import { linksValidation } from "../../validations"

const router = express.Router()

router.post("/", auth(), validate(linksValidation.createLink), linksController.createShortUrl)
router.get("/", auth(), linksController.getAllShortUrls)
router.get("/:shortCode", linksController.getOriginalUrl)
router.delete("/:shortCode", auth(), linksController.deleteShortUrl)

export default router
