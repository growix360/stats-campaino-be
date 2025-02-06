import dotenv from "dotenv"
import path from "path"
import Joi from "joi"

dotenv.config({ path: path.join(process.cwd(), ".env") })

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid("production", "development", "test").required(),
    PORT: Joi.number().default(4001),
    JWT_SECRET: Joi.string().required().description("JWT secret key"),
    DATABASE_URL: Joi.string().required().description("DATABASE_URL is required in env"),
    DATABASE_URL_DB2: Joi.string().required().description("DATABASE_URL_DB2 is required in env"),
    BASE_URL: Joi.string().required().description("BASE_URL is required in env"),
  })
  .unknown()

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

export default {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwt: {
    secret: envVars.JWT_SECRET,
  },
}
