import { NextResponse } from "next/server";
import { validateApiToken } from "@/lib/actions/api-tokens";
import { apiTokenLimiter, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export interface ApiAuthResult {
  authorized: boolean;
  userId?: string;
  permissions?: string[];
  error?: string;
}

/**
 * Authenticate an API request using Bearer token
 */
export async function authenticateApiRequest(
  request: Request
): Promise<ApiAuthResult> {
  // Rate limit API token validation attempts per IP
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(apiTokenLimiter, ip);
  if (!rateLimit.success) {
    return { authorized: false, error: "Too many API requests. Please try again later." };
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return { authorized: false, error: "Missing Authorization header" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false, error: "Invalid Authorization format. Use: Bearer <token>" };
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  const validation = await validateApiToken(token);

  if (!validation.valid) {
    return { authorized: false, error: validation.error };
  }

  return {
    authorized: true,
    userId: validation.userId,
    permissions: validation.permissions,
  };
}

/**
 * Check if the user has the required permission
 */
export function hasPermission(
  permissions: string[] | undefined,
  required: "READ" | "WRITE"
): boolean {
  if (!permissions) return false;

  // WRITE implies READ
  if (required === "READ") {
    return permissions.includes("READ") || permissions.includes("WRITE");
  }

  return permissions.includes(required);
}

/**
 * Create an error response for API errors
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message, success: false },
    { status }
  );
}

/**
 * Create a success response for API
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(
    { ...data, success: true },
    { status }
  );
}
