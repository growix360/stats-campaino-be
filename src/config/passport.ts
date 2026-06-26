import { prismaDB1 } from "../client"
import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback } from "passport-jwt"
import config from "./config"

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
}

const jwtVerify: VerifyCallback = async (payload, done) => {
  try {
    const user = await prismaDB1.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      where: { id: payload.id, deletedAt: null },
    })
    if (!user) {
      return done(null, false)
    }
    done(null, user)
  } catch (error) {
    done(error, false)
  }
}

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify)
