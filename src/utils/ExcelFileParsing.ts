import * as XLSX from "xlsx"
import fs from "fs"

export const extractEmailsFromExcel = (filePath: string): string[] => {
  const file = fs.readFileSync(filePath)

  const workbook = XLSX.read(file, { type: "buffer" })

  const sheetNames = workbook.SheetNames
  const firstSheet = workbook.Sheets[sheetNames[0]]

  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

  const emails: string[] = []

  data.forEach((row: any) => {
    if (row[0] && isValidEmail(row[0])) {
      emails.push(row[0])
    }
  })

  return emails
}

// Utility function to validate email format
const isValidEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
  return regex.test(email)
}
