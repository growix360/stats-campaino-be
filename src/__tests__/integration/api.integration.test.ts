import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import httpStatus from "http-status"
import app from "../../app"
import { prismaDB1, prismaDB2 } from "../../client"
import { Role } from "../../../generated/client1"
import { encryptPassword } from "../../utils/encryption"
import jwt from "jsonwebtoken"
import config from "../../config/config"

const ADMIN_ID = "11111111-1111-4111-8111-111111111111"
const MANAGER_ID = "22222222-2222-4222-8222-222222222222"
const USER_ID = "33333333-3333-4333-8333-333333333333"
const DOMAIN_ID = "44444444-4444-4444-8444-444444444444"
const OTHER_DOMAIN_ID = "55555555-5555-4555-8555-555555555555"
const TEMPLATE_ID = "66666666-6666-4666-8666-666666666666"
const CAMPAIGN_IN_DOMAIN = "77777777-7777-4777-8777-777777777777"
const CAMPAIGN_OTHER_DOMAIN = "88888888-8888-4888-8888-888888888888"

const TEST_PASSWORD = "Password1"

describe("API integration", () => {
  beforeAll(async () => {
    const hashedPassword = await encryptPassword(TEST_PASSWORD)

    await prismaDB1.user.createMany({
      data: [
        { id: ADMIN_ID, email: "admin@test.local", name: "Admin", password: hashedPassword, role: Role.ADMIN },
        {
          id: MANAGER_ID,
          email: "manager@test.local",
          name: "Manager",
          password: hashedPassword,
          role: Role.MANAGER,
        },
        { id: USER_ID, email: "user@test.local", name: "User", password: hashedPassword, role: Role.USER },
      ],
      skipDuplicates: true,
    })

    await prismaDB1.domain.createMany({
      data: [
        { id: DOMAIN_ID, fromEmail: "a@test.local", fromName: "Domain A" },
        { id: OTHER_DOMAIN_ID, fromEmail: "b@test.local", fromName: "Domain B" },
      ],
      skipDuplicates: true,
    })

    await prismaDB1.userDomain.createMany({
      data: [{ userId: MANAGER_ID, domainId: DOMAIN_ID }],
      skipDuplicates: true,
    })

    await prismaDB1.template.createMany({
      data: [
        {
          id: TEMPLATE_ID,
          name: "integration-test-template",
          subject: "Subject",
          emailBody: "<p>Body</p>",
          createdBy: ADMIN_ID,
        },
      ],
      skipDuplicates: true,
    })

    await prismaDB1.campaign.createMany({
      data: [
        {
          id: CAMPAIGN_IN_DOMAIN,
          name: "In Domain Campaign",
          subject: "Subject",
          link: "https://example.com",
          emailBody: "<p>Body</p>",
          createdBy: ADMIN_ID,
          templateName: "integration-test-template",
          templateId: TEMPLATE_ID,
          domainId: DOMAIN_ID,
        },
        {
          id: CAMPAIGN_OTHER_DOMAIN,
          name: "Other Domain Campaign",
          subject: "Subject",
          link: "https://example.com",
          emailBody: "<p>Body</p>",
          createdBy: ADMIN_ID,
          templateName: "integration-test-template",
          templateId: TEMPLATE_ID,
          domainId: OTHER_DOMAIN_ID,
        },
      ],
      skipDuplicates: true,
    })
  })

  afterAll(async () => {
    await prismaDB2.campaignUpdateHistory.deleteMany({
      where: { campaignId: { in: [CAMPAIGN_IN_DOMAIN, CAMPAIGN_OTHER_DOMAIN] } },
    })
    await prismaDB1.campaign.deleteMany({
      where: { id: { in: [CAMPAIGN_IN_DOMAIN, CAMPAIGN_OTHER_DOMAIN] } },
    })
    await prismaDB1.template.deleteMany({ where: { id: TEMPLATE_ID } })
    await prismaDB1.userDomain.deleteMany({ where: { userId: MANAGER_ID } })
    await prismaDB1.domain.deleteMany({ where: { id: { in: [DOMAIN_ID, OTHER_DOMAIN_ID] } } })
    await prismaDB1.user.deleteMany({
      where: { id: { in: [ADMIN_ID, MANAGER_ID, USER_ID] } },
    })
    await prismaDB1.$disconnect()
    await prismaDB2.$disconnect()
  })

  describe("POST /v1/auth/login", () => {
    it("returns token for admin", async () => {
      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email: "admin@test.local", password: TEST_PASSWORD })

      expect(response.status).toBe(httpStatus.OK)
      expect(response.body.user.access_token).toBeDefined()
      expect(response.body.user.role).toBe(Role.ADMIN)
    })

    it("returns generic 401 for wrong password", async () => {
      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email: "admin@test.local", password: "WrongPassword1" })

      expect(response.status).toBe(httpStatus.UNAUTHORIZED)
      expect(response.body.message).toBe("Incorrect email or password.")
    })

    it("returns generic 401 for unknown email", async () => {
      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email: "missing@test.local", password: TEST_PASSWORD })

      expect(response.status).toBe(httpStatus.UNAUTHORIZED)
      expect(response.body.message).toBe("Incorrect email or password.")
    })

    it("returns 403 for USER role", async () => {
      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email: "user@test.local", password: TEST_PASSWORD })

      expect(response.status).toBe(httpStatus.FORBIDDEN)
      expect(response.body.message).toBe("You are not allowed to login.")
    })
  })

  describe("GET /v1/campaign/", () => {
    it("returns 401 without token", async () => {
      const response = await request(app).get("/v1/campaign/")
      expect(response.status).toBe(httpStatus.UNAUTHORIZED)
    })

    it("scopes manager to assigned domain campaigns", async () => {
      const token = jwt.sign({ id: MANAGER_ID, role: Role.MANAGER }, config.jwt.secret, {
        expiresIn: "1h",
      })

      const response = await request(app)
        .get("/v1/campaign/")
        .set("Authorization", `Bearer ${token}`)

      expect(response.status).toBe(httpStatus.OK)
      const campaignIds = response.body.campaigns.map((campaign: { id: string }) => campaign.id)
      expect(campaignIds).toContain(CAMPAIGN_IN_DOMAIN)
      expect(campaignIds).not.toContain(CAMPAIGN_OTHER_DOMAIN)
    })
  })

  describe("GET /v1/campaign/:campaignId/current-stats", () => {
    it("returns 403 when manager accesses out-of-domain campaign", async () => {
      const token = jwt.sign({ id: MANAGER_ID, role: Role.MANAGER }, config.jwt.secret, {
        expiresIn: "1h",
      })

      const response = await request(app)
        .get(`/v1/campaign/${CAMPAIGN_OTHER_DOMAIN}/current-stats`)
        .set("Authorization", `Bearer ${token}`)

      expect(response.status).toBe(httpStatus.FORBIDDEN)
    })
  })
})
