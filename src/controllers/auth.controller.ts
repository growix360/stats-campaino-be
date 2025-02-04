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
  res.status(httpStatus.CREATED).send({ user: user })
})

// const logout = catchAsync(async (req, res) => {
//   await authService.logout(req.body.refreshToken);
//   res.status(httpStatus.NO_CONTENT).send();
// });

// const refreshTokens = catchAsync(async (req, res) => {
//   const tokens = await authService.refreshAuth(req.body.refreshToken);
//   res.send({ ...tokens });
// });

// const forgotPassword = catchAsync(async (req, res) => {
//   const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
//   await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
//   res.status(httpStatus.NO_CONTENT).send();
// });

// const resetPassword = catchAsync(async (req, res) => {
//   await authService.resetPassword(req.query.token as string, req.body.password);
//   res.status(httpStatus.NO_CONTENT).send();
// });

// const sendVerificationEmail = catchAsync(async (req, res) => {
//   const user = req.user as User;
//   const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
//   await emailService.sendVerificationEmail(user.email, verifyEmailToken);
//   res.status(httpStatus.NO_CONTENT).send();
// });

// const verifyEmail = catchAsync(async (req, res) => {
//   await authService.verifyEmail(req.query.token as string);
//   res.status(httpStatus.NO_CONTENT).send();
// });

export default {
  register,
  login,
  //   logout,
  //   refreshTokens,
  //   forgotPassword,
  //   resetPassword,
  //   sendVerificationEmail,
  //   verifyEmail
}
