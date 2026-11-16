import crypto from "crypto"

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

function generateCode(prefix: string, length: number): string {
  let result = ""
  const alphabetLength = ALPHABET.length
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % alphabetLength]
  }
  return `${prefix}-${result}`
}

export const generateCampaignCode = (): string => generateCode("CMP", 6)
export const generateClickCode = (): string => generateCode("CLK", 8)
export const generateRecipientCode = (): string => generateCode("SUB", 6)
