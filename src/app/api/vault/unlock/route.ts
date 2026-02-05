import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { unlockLimiter, checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { unlockSchema, validateInput } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (by user ID to prevent brute force per account)
    const rateLimitResult = await checkRateLimit(unlockLimiter, session.user.id);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many unlock attempts. Please try again later." },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining ?? 0, rateLimitResult.reset ?? 0),
        }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(unlockSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { masterPassword } = validation.data;

    // Get user with master password hash and salt
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        masterPassword: true,
        encryptionSalt: true,
      },
    });

    if (!user?.masterPassword || !user?.encryptionSalt) {
      return NextResponse.json(
        { error: "Vault not set up. Please complete registration." },
        { status: 400 }
      );
    }

    // Verify master password
    const isValid = await bcrypt.compare(masterPassword, user.masterPassword);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid master password" },
        { status: 401 }
      );
    }

    // Return the salt so the client can derive the encryption key
    return NextResponse.json({
      success: true,
      salt: user.encryptionSalt,
    });
  } catch (error) {
    logger.error("Unlock API error", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
