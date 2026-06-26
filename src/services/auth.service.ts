import { User, Role } from "../../generated/client1"
import { prismaDB1 } from "../client"
import config from "../config/config"
import ApiError from "../utils/ApiError"
import httpStatus from "http-status"
import { encryptPassword, isPasswordMatch } from "../utils/encryption"
import jwt from "jsonwebtoken"

const register = async (
  email: string,
  password: string,
  name: string,
  role: Role = Role.USER,
): Promise<Partial<User> & { access_token: string }> => {
  const existingUser = await prismaDB1.user.findUnique({
    where: { email },
  })

  // Throw an error if the user exists
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists.")
  }

  const user = await prismaDB1.user.create({
    data: {
      email,
      name,
      password: await encryptPassword(password),
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const access_token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: "1h" },
  )

  return { ...user, access_token }
}

const loginUserWithEmailAndPassword = async (
  email: string,
  password: string,
): Promise<Partial<User> & { access_token: string }> => {
  // Find the user by email
  const existingUser = await prismaDB1.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!existingUser) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password.")
  }

  if (existingUser.role !== Role.MANAGER && existingUser.role !== Role.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to login.")
  }

  const isPasswordValid = await isPasswordMatch(password, existingUser.password)
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password.")
  }

  // Generate the JWT token
  const access_token = jwt.sign(
    {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    },
    config.jwt.secret,
    { expiresIn: "1h" },
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = existingUser

  // Return the user data and the access token
  return { ...userWithoutPassword, access_token }
}

export default {
  register,
  loginUserWithEmailAndPassword,
}
