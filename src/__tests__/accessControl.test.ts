import { describe, expect, it } from "@jest/globals"
import { Role } from "../../generated/client1"
import { isAdmin, isManager } from "../utils/accessControl"

describe("accessControl", () => {
  it("identifies admin role", () => {
    expect(isAdmin({ role: Role.ADMIN })).toBe(true)
    expect(isManager({ role: Role.ADMIN })).toBe(false)
  })

  it("identifies manager role", () => {
    expect(isManager({ role: Role.MANAGER })).toBe(true)
    expect(isAdmin({ role: Role.MANAGER })).toBe(false)
  })
})
