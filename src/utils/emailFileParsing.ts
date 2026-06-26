const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ParsedEmailFileResult {
  validEmails: string[]
  invalidLines: number
  duplicateLines: number
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(normalizeEmail(value))

const parseCsvLine = (line: string): string[] => {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }

  values.push(current.trim())
  return values
}

const extractEmailFromCsvRow = (row: string[], header?: string[]): string | null => {
  if (header) {
    const emailIndex = header.findIndex((cell) => cell.toLowerCase() === "email")
    if (emailIndex >= 0 && row[emailIndex]) {
      return row[emailIndex]
    }
  }

  for (let i = row.length - 1; i >= 0; i -= 1) {
    const cell = row[i]
    if (cell && cell.includes("@")) {
      return cell
    }
  }

  return null
}

export const parseEmailFile = (
  content: string,
  filename: string,
  maxEmails: number,
): ParsedEmailFileResult => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { validEmails: [], invalidLines: 0, duplicateLines: 0 }
  }

  const isCsv = filename.toLowerCase().endsWith(".csv")
  const seen = new Set<string>()
  const validEmails: string[] = []
  let invalidLines = 0
  let duplicateLines = 0

  let header: string[] | undefined
  let startIndex = 0

  if (isCsv) {
    header = parseCsvLine(lines[0]).map((cell) => cell.replace(/^"|"$/g, ""))
    startIndex = 1
  }

  for (let i = startIndex; i < lines.length; i += 1) {
    if (validEmails.length >= maxEmails) {
      break
    }

    const rawValue = isCsv ? extractEmailFromCsvRow(parseCsvLine(lines[i]), header) : lines[i]
    if (!rawValue) {
      invalidLines += 1
      continue
    }

    const email = normalizeEmail(rawValue.replace(/^"|"$/g, ""))
    if (!isValidEmail(email)) {
      invalidLines += 1
      continue
    }

    if (seen.has(email)) {
      duplicateLines += 1
      continue
    }

    seen.add(email)
    validEmails.push(email)
  }

  return { validEmails, invalidLines, duplicateLines }
}

export const dedupeAgainstExisting = (
  candidates: string[],
  existing: Set<string>,
): { emails: string[]; skippedDuplicates: number } => {
  const emails: string[] = []
  let skippedDuplicates = 0

  for (const email of candidates) {
    const normalized = normalizeEmail(email)
    if (existing.has(normalized)) {
      skippedDuplicates += 1
      continue
    }
    existing.add(normalized)
    emails.push(normalized)
  }

  return { emails, skippedDuplicates }
}
