import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyTOTPCode } from "@/lib/totp";
import { logAudit } from "@/lib/audit";
import { totpCodeSchema, validateInput } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(totpCodeSchema, body.code);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const code = validation.data;

    // Get user with TOTP secret
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication not set up. Please start setup first." },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = await verifyTOTPCode(code, user.twoFactorSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Enable 2FA if not already enabled
    if (!user.twoFactorEnabled) {
      await db.user.update({
        where: { id: session.user.id },
        data: { twoFactorEnabled: true },
      });

      // Log the event
      await logAudit({
        userId: session.user.id,
        action: "ENABLE_2FA",
        resource: "SETTINGS",
        request: req,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
    });
  } catch (error) {
    logger.error("2FA verify error", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
