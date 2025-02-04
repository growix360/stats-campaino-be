import jwt from "jsonwebtoken"
import moment, { Moment } from "moment"
import config from "../config/config"

const generateToken = (userId: string, expires: Moment, secret = config.jwt.secret): string => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
  }
  return jwt.sign(payload, secret)
}

export default {
  generateToken,
}
