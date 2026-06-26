import { describe, expect, it, jest } from "@jest/globals"
import httpStatus from "http-status"
import ApiError from "../utils/ApiError"
import { errorConverter } from "../middlewares/error"

describe("errorConverter", () => {
  it("preserves explicit status codes on non-ApiError errors", () => {
    const err = Object.assign(new Error("Not found"), { statusCode: httpStatus.NOT_FOUND })
    const next = jest.fn()
    errorConverter(err, {} as never, {} as never, next)
    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
    expect((next.mock.calls[0]![0] as ApiError).statusCode).toBe(httpStatus.NOT_FOUND)
  })

  it("defaults unknown errors to 500", () => {
    const err = new Error("Unexpected failure")
    const next = jest.fn()
    errorConverter(err, {} as never, {} as never, next)
    expect((next.mock.calls[0]![0] as ApiError).statusCode).toBe(httpStatus.INTERNAL_SERVER_ERROR)
  })

  it("passes through ApiError unchanged", () => {
    const err = new ApiError(httpStatus.FORBIDDEN, "Forbidden")
    const next = jest.fn()
    errorConverter(err, {} as never, {} as never, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})
