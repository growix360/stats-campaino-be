import express from "express"
import path from "path"
import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import swaggerDefinition from "../../docs/swaggerDef"

const router = express.Router()

const docsRoot = path.join(process.cwd(), "src/docs")

const specs = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [path.join(docsRoot, "components.yml"), path.join(docsRoot, "paths", "*.yml")],
})

router.use("/", swaggerUi.serve)
router.get(
  "/",
  swaggerUi.setup(specs, {
    explorer: true,
  }),
)

export default router
