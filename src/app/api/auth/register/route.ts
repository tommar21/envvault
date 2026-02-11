import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { registerLimiter, getClientIp, checkRateLimit, rateLimitHeaders, formatRetryTime } from "@/lib/rate-limit";
import { registerSchema, validateInput } from "@/lib/validation/schemas";
import { generateSalt } from "@/lib/crypto/encryption";

export async function POST(req: Request) {
  try {
    // Check rate limit
    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(registerLimiter, ip);

    if (!rateLimitResult.success) {
      const retryIn = formatRetryTime(rateLimitResult.reset ?? Date.now() + 60000);
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${retryIn}.` },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining ?? 0, rateLimitResult.reset ?? 0),
        }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(registerSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name, email, password, masterPassword } = validation.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash passwords
    const hashedPassword = await bcrypt.hash(password, 12);
    const hashedMasterPassword = await bcrypt.hash(masterPassword, 12);

    // Generate encryption salt (this will be used to derive the encryption key)
    const encryptionSalt = generateSalt();

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        masterPassword: hashedMasterPassword,
        encryptionSalt,
      },
    });

    await logAudit({ userId: user.id, action: "REGISTER", request: req });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      userId: user.id,
    });
  } catch (error) {
    logger.error("Registration error", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
