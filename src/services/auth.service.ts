import { User, Role } from "@prisma/client"
import { prismaDB2 } from "../client"
import ApiError from "../utils/ApiError"
import { encryptPassword } from "../utils/encryption"
import jwt from "jsonwebtoken"
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"
import { isPasswordMatch } from "../utils/encryption"

const register = async (
  email: string,
  password: string,
  name: string,
  role: Role = Role.MANAGER
): Promise<Partial<User> & { access_token: string }> => {
  const existingUser = await prismaDB2.user.findUnique({
    where: { email },
  })

  // Throw an error if the user exists
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists.")
  }

  const user = await prismaDB2.user.create({
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
    JWT_SECRET,
    { expiresIn: "1h" } // Token expires in 1 hour
  )

  // Return the created user along with the token
  return { ...user, access_token }
}

const loginUserWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<Partial<User> & { access_token: string }> => {
  // Find the user by email
  const existingUser = await prismaDB2.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true, // Include the hashed password for validation
      createdAt: true,
      updatedAt: true,
    },
  })

  // Throw an error if the user does not exist
  if (!existingUser) {
    throw new ApiError(404, "User with this email does not exist.")
  }

  // Validate the password
  const isPasswordValid = await isPasswordMatch(password, existingUser.password)
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password.")
  }

  // Generate the JWT token
  const access_token = jwt.sign(
    {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    },
    JWT_SECRET,
    { expiresIn: "1h" } // Token expires in 1 hour
  )

  // Exclude the password from the returned object
  const { password: _, ...userWithoutPassword } = existingUser

  // Return the user data and the access token
  return { ...userWithoutPassword, access_token }
}

export default {
  register,
  loginUserWithEmailAndPassword,
}
