import { Role } from "../../generated/client1"

const allRoles = {
  [Role.USER]: [],
  [Role.ADMIN]: ["getUsers", "manageUsers"],
}

export const roles = Object.keys(allRoles)
export const roleRights = new Map(Object.entries(allRoles))
