import { describe, expect, it } from "@jest/globals"
import { dedupeAgainstExisting, parseEmailFile } from "../utils/emailFileParsing"

describe("emailFileParsing", () => {
  it("parses csv with Email header", () => {
    const content = `Index,Email
1,one@example.com
2,two@example.com`

    const result = parseEmailFile(content, "list.csv", 100)
    expect(result.validEmails).toEqual(["one@example.com", "two@example.com"])
    expect(result.invalidLines).toBe(0)
  })

  it("parses txt one email per line", () => {
    const content = `alpha@example.com
bad-email
beta@example.com`

    const result = parseEmailFile(content, "list.txt", 100)
    expect(result.validEmails).toEqual(["alpha@example.com", "beta@example.com"])
    expect(result.invalidLines).toBe(1)
  })

  it("dedupes against existing addresses", () => {
    const existing = new Set(["one@example.com"])
    const result = dedupeAgainstExisting(
      ["one@example.com", "two@example.com", "two@example.com"],
      existing,
    )

    expect(result.emails).toEqual(["two@example.com"])
    expect(result.skippedDuplicates).toBe(2)
  })
})
