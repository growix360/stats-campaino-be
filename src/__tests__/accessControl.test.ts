import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import httpStatus from "http-status"
import { Role } from "../../generated/client1"
import ApiError from "../utils/ApiError"

jest.mock("../client", () => ({
  prismaDB1: {
    userDomain: {
      findMany: jest.fn(),
    },
    campaign: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

import { prismaDB1 } from "../client"
import {
  assertAuthenticatedRole,
  assertCampaignAccess,
  buildCampaignScope,
  getAccessibleCampaignIds,
  isAdmin,
  isManager,
} from "../utils/accessControl"

const mockFindManyUserDomain = prismaDB1.userDomain.findMany as jest.MockedFunction<
  typeof prismaDB1.userDomain.findMany
>
const mockFindFirstCampaign = prismaDB1.campaign.findFirst as jest.MockedFunction<
  typeof prismaDB1.campaign.findFirst
>
const mockFindManyCampaign = prismaDB1.campaign.findMany as jest.MockedFunction<
  typeof prismaDB1.campaign.findMany
>

const adminUser = { id: "admin-id", role: Role.ADMIN }
const managerUser = { id: "manager-id", role: Role.MANAGER }

describe("accessControl", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("role helpers", () => {
    it("identifies admin role", () => {
      expect(isAdmin({ role: Role.ADMIN })).toBe(true)
      expect(isManager({ role: Role.ADMIN })).toBe(false)
    })

    it("identifies manager role", () => {
      expect(isManager({ role: Role.MANAGER })).toBe(true)
      expect(isAdmin({ role: Role.MANAGER })).toBe(false)
    })
  })

  describe("assertAuthenticatedRole", () => {
    it("allows admin and manager", () => {
      expect(() => assertAuthenticatedRole({ role: Role.ADMIN })).not.toThrow()
      expect(() => assertAuthenticatedRole({ role: Role.MANAGER })).not.toThrow()
    })

    it("rejects USER role", () => {
      expect(() => assertAuthenticatedRole({ role: Role.USER })).toThrow(ApiError)
      try {
        assertAuthenticatedRole({ role: Role.USER })
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(httpStatus.FORBIDDEN)
      }
    })
  })

  describe("buildCampaignScope", () => {
    it("returns all non-deleted campaigns for admin", async () => {
      const scope = await buildCampaignScope(adminUser)
      expect(scope).toEqual({ deletedAt: null })
    })

    it("returns empty scope for manager with no domain assignments", async () => {
      mockFindManyUserDomain.mockResolvedValue([])
      const scope = await buildCampaignScope(managerUser)
      expect(scope).toEqual({ deletedAt: null, id: { in: [] } })
    })

    it("scopes manager to assigned domains", async () => {
      mockFindManyUserDomain.mockResolvedValue([{ domainId: "domain-1" }] as never)
      const scope = await buildCampaignScope(managerUser)
      expect(scope).toEqual({
        deletedAt: null,
        domainId: { in: ["domain-1"] },
      })
    })
  })

  describe("assertCampaignAccess", () => {
    const campaign = {
      id: "campaign-1",
      name: "Test Campaign",
      domainId: "domain-1",
      emailListId: null,
      hasCompleted: false,
    }

    it("throws 404 when campaign does not exist", async () => {
      mockFindFirstCampaign.mockResolvedValue(null)
      await expect(assertCampaignAccess(adminUser, "missing-id")).rejects.toMatchObject({
        statusCode: httpStatus.NOT_FOUND,
      })
    })

    it("allows admin access to any campaign", async () => {
      mockFindFirstCampaign.mockResolvedValue(campaign as never)
      const result = await assertCampaignAccess(adminUser, campaign.id)
      expect(result).toEqual(campaign)
    })

    it("allows manager access when domain is assigned", async () => {
      mockFindFirstCampaign.mockResolvedValue(campaign as never)
      mockFindManyUserDomain.mockResolvedValue([{ domainId: "domain-1" }] as never)
      const result = await assertCampaignAccess(managerUser, campaign.id)
      expect(result).toEqual(campaign)
    })

    it("denies manager when campaign has no domainId", async () => {
      mockFindFirstCampaign.mockResolvedValue({ ...campaign, domainId: null } as never)
      await expect(assertCampaignAccess(managerUser, campaign.id)).rejects.toMatchObject({
        statusCode: httpStatus.FORBIDDEN,
      })
    })

    it("denies manager when domain is not assigned", async () => {
      mockFindFirstCampaign.mockResolvedValue(campaign as never)
      mockFindManyUserDomain.mockResolvedValue([{ domainId: "other-domain" }] as never)
      await expect(assertCampaignAccess(managerUser, campaign.id)).rejects.toMatchObject({
        statusCode: httpStatus.FORBIDDEN,
      })
    })
  })

  describe("getAccessibleCampaignIds", () => {
    it("returns null for admin", async () => {
      const result = await getAccessibleCampaignIds(adminUser)
      expect(result).toBeNull()
    })

    it("returns campaign ids for manager", async () => {
      mockFindManyUserDomain.mockResolvedValue([{ domainId: "domain-1" }] as never)
      mockFindManyCampaign.mockResolvedValue([{ id: "campaign-1" }, { id: "campaign-2" }] as never)
      const result = await getAccessibleCampaignIds(managerUser)
      expect(result).toEqual(["campaign-1", "campaign-2"])
    })
  })
})
