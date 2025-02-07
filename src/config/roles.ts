import { Role } from "../../generated/client2"

const allRoles = {
  [Role.USER]: [],
  [Role.ADMIN]: ["getUsers", "manageUsers"],
}

export const roles = Object.keys(allRoles)
export const roleRights = new Map(Object.entries(allRoles))
