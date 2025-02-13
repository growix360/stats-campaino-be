import httpStatus from "http-status"
import catchAsync from "../utils/catchAsync"
import { authService } from "../services"
// import { authService, userService, tokenService, emailService } from '../services';
// import exclude from "../utils/exclude"

const register = catchAsync(async (req, res) => {
  const { email, password, name } = req.body
  const user = await authService.register(email, password, name)

  res.status(httpStatus.CREATED).send({ user: user })
})

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body
  const user = await authService.loginUserWithEmailAndPassword(email, password)
  res.status(httpStatus.OK).send({ user: user })
})

export default {
  register,
  login,
}
