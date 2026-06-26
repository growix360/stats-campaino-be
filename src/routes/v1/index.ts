import express from "express"
import authRoute from "./auth.route"
import campaignRoute from "./campaign.route"
import docsRoute from "./docs.route"

const router = express.Router()

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/campaign",
    route: campaignRoute,
  },
  {
    path: "/docs",
    route: docsRoute,
  },
]

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route)
})

export default router
