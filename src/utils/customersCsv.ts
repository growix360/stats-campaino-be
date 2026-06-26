import fs from "fs"
import path from "path"
import httpStatus from "http-status"
import ApiError from "./ApiError"
import { dedupeAgainstExisting, isValidEmail } from "./emailFileParsing"

interface LineIndex {
  offset: number
  length: number
}

let lineIndex: LineIndex[] | null = null
let indexedPath: string | null = null

const getCustomersCsvPath = (): string => {
  const configured = process.env.CUSTOMERS_CSV_PATH
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured)
  }
  return path.join(process.cwd(), "docs/customers-100000.csv")
}

const buildLineIndex = (filePath: string): LineIndex[] => {
  const content = fs.readFileSync(filePath)
  const indexes: LineIndex[] = []
  let lineStart = 0

  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === 0x0a) {
      const lineEnd = content[i - 1] === 0x0d ? i - 1 : i
      const length = lineEnd - lineStart
      if (length > 0) {
        indexes.push({ offset: lineStart, length })
      }
      lineStart = i + 1
    }
  }

  if (lineStart < content.length) {
    indexes.push({ offset: lineStart, length: content.length - lineStart })
  }

  // Skip header row
  return indexes.slice(1)
}

const ensureIndex = (): LineIndex[] => {
  const filePath = getCustomersCsvPath()
  if (!fs.existsSync(filePath)) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Default email pool unavailable (customers CSV missing at ${filePath}). Upload a .csv/.txt file when increasing sent, or set CUSTOMERS_CSV_PATH on the server.`,
    )
  }

  if (lineIndex && indexedPath === filePath) {
    return lineIndex
  }

  lineIndex = buildLineIndex(filePath)
  indexedPath = filePath
  return lineIndex
}

const readEmailAtIndex = (index: LineIndex): string | null => {
  const filePath = getCustomersCsvPath()
  const buffer = Buffer.alloc(index.length)
  const fd = fs.openSync(filePath, "r")
  fs.readSync(fd, buffer, 0, index.length, index.offset)
  fs.closeSync(fd)

  const line = buffer.toString("utf8")
  const columns = line.split(",")
  const email = columns[columns.length - 1]?.trim().replace(/^"|"$/g, "")
  if (!email || !isValidEmail(email)) {
    return null
  }
  return email.toLowerCase()
}

export const pickRandomEmails = (count: number, exclude: Set<string>): string[] => {
  if (count <= 0) {
    return []
  }

  const indexes = ensureIndex()
  if (indexes.length === 0) {
    return []
  }

  const picked: string[] = []
  const seen = new Set<string>(exclude)
  const maxAttempts = count * 3
  let attempts = 0

  while (picked.length < count && attempts < maxAttempts) {
    attempts += 1
    const randomIndex = indexes[Math.floor(Math.random() * indexes.length)]
    const email = readEmailAtIndex(randomIndex)
    if (!email || seen.has(email)) {
      continue
    }
    seen.add(email)
    picked.push(email)
  }

  return picked
}

export const resetCustomersCsvIndexForTests = (): void => {
  lineIndex = null
  indexedPath = null
}

export { dedupeAgainstExisting }
