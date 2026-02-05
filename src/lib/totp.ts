import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const APP_NAME = "SecretBox";

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  return generateSecret();
}

/**
 * Generate OTP Auth URI for QR code
 */
export function generateOTPAuthURI(email: string, secret: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataURL(otpAuthURI: string): Promise<string> {
  return QRCode.toDataURL(otpAuthURI, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Verify a TOTP code
 */
export async function verifyTOTPCode(token: string, secret: string): Promise<boolean> {
  try {
    // epochTolerance of 30 seconds allows 1 step before/after for clock drift
    const result = await verify({ token, secret, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes (one-time use)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Format backup code for display (XXXX-XXXX format)
 */
export function formatBackupCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
