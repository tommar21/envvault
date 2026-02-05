import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  generateTOTPSecret,
  generateOTPAuthURI,
  generateQRCodeDataURL,
} from "@/lib/totp";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if 2FA is already enabled
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });

    if (user?.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled" },
        { status: 400 }
      );
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    const otpAuthURI = generateOTPAuthURI(session.user.email, secret);
    const qrCodeDataURL = await generateQRCodeDataURL(otpAuthURI);

    // Store the secret temporarily (not enabled yet until verified)
    await db.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: secret },
    });

    return NextResponse.json({
      success: true,
      secret, // For manual entry in authenticator app
      qrCode: qrCodeDataURL,
    });
  } catch (error) {
    logger.error("2FA setup error", error);
    return NextResponse.json(
      { error: "Failed to setup two-factor authentication" },
      { status: 500 }
    );
  }
}
