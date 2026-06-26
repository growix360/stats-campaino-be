import { Role } from "../../generated/client1"

type BodyFieldRecord = Record<string, unknown> & {
  emailBody?: string
  htmlBody?: string
}

/** Main backend API uses `htmlBody`; DB column is `emailBody`. */
export const withHtmlBodyAlias = <T extends BodyFieldRecord>(
  record: T,
): T & { htmlBody: string } => ({
  ...record,
  htmlBody: record.emailBody ?? record.htmlBody ?? "",
})

export const mapCampaignToApi = <T extends BodyFieldRecord>(campaign: T) =>
  withHtmlBodyAlias(campaign)

export const mapTemplateToApi = <T extends BodyFieldRecord>(template: T) =>
  withHtmlBodyAlias(template)

const ROLE_VALUES = new Set<string>(Object.values(Role))

export const normalizeRoles = (...roles: (Role | string)[]): Role[] =>
  roles.map((role) => {
    const value = typeof role === "string" ? role.toUpperCase() : role
    if (!ROLE_VALUES.has(value)) {
      throw new Error(`Invalid role: ${String(role)}`)
    }
    return value as Role
  })

export default {
  withHtmlBodyAlias,
  mapCampaignToApi,
  mapTemplateToApi,
  normalizeRoles,
}
