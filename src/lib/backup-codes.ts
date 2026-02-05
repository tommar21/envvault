import { hash, compare } from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a backup code for secure storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Normalize the code (remove any formatting, uppercase)
  const normalizedCode = code.replace(/-/g, "").toUpperCase();
  return hash(normalizedCode, SALT_ROUNDS);
}

/**
 * Verify a backup code against stored hashes
 * Returns the index of the matched code if found, or -1 if not found
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  // Normalize the code (remove any formatting, uppercase)
  const normalizedCode = code.replace(/-/g, "").toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await compare(normalizedCode, hashedCodes[i]);
    if (isMatch) {
      return i;
    }
  }

  return -1;
}

/**
 * Remove a used backup code from the list
 */
export function removeBackupCode(
  hashedCodes: string[],
  usedIndex: number
): string[] {
  return hashedCodes.filter((_, index) => index !== usedIndex);
}
