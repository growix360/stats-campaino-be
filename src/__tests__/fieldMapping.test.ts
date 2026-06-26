import { describe, expect, it } from "@jest/globals"
import { mapCampaignToApi, normalizeRoles } from "../utils/fieldMapping"
import { Role } from "../../generated/client1"

describe("fieldMapping", () => {
  it("maps emailBody to htmlBody on campaigns", () => {
    const mapped = mapCampaignToApi({
      id: "1",
      emailBody: "<p>Hello</p>",
    })

    expect(mapped.htmlBody).toBe("<p>Hello</p>")
    expect(mapped.emailBody).toBe("<p>Hello</p>")
  })

  it("normalizes string roles for auth middleware", () => {
    expect(normalizeRoles("admin", Role.MANAGER)).toEqual([Role.ADMIN, Role.MANAGER])
  })
})
