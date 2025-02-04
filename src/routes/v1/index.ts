import express from "express"
import authRoute from "./auth.route"
import campaignRoute from "./campaign.route"
import linksRoute from "./links.route"
import docsRoute from "./docs.route"
import config from "../../config/config"

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
    path: "/link",
    route: linksRoute,
  },
]

const devRoutes = [
  // routes available only in development mode
  {
    path: "/docs",
    route: docsRoute,
  },
  {
    path: "/campaign",
    route: campaignRoute,
  },
]

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route)
})

/* istanbul ignore next */
if (config.env === "development") {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route)
  })
}

export default router
