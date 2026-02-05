"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth-helpers";
import crypto from "crypto";

export type ApiPermission = "READ" | "WRITE";

interface CreateTokenInput {
  name: string;
  permissions: ApiPermission[];
  expiresAt?: string | null;
}

// Generate a secure random token
function generateToken(): string {
  const randomBytes = crypto.randomBytes(32);
  return `sb_${randomBytes.toString("base64url")}`;
}

// Hash the token for storage
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createApiToken(data: CreateTokenInput) {
  const userId = await requireAuth();

  // Generate the actual token
  const token = generateToken();
  const tokenHash = hashToken(token);
  const tokenPrefix = token.substring(0, 11); // sb_xxxxxxx

  const apiToken = await db.apiToken.create({
    data: {
      userId,
      name: data.name,
      tokenHash,
      tokenPrefix,
      permissions: data.permissions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  await logAudit({
    userId,
    action: "CREATE_VARIABLE",
    resource: "API_TOKEN",
    resourceId: apiToken.id,
    metadata: { name: data.name, permissions: data.permissions },
  });

  revalidatePath("/dashboard/settings/api-tokens");

  // Return the token only once - it won't be shown again
  return {
    id: apiToken.id,
    name: apiToken.name,
    token, // Full token - only shown once!
    tokenPrefix,
    permissions: apiToken.permissions,
    expiresAt: apiToken.expiresAt,
    createdAt: apiToken.createdAt,
  };
}

export async function getApiTokens() {
  const userId = await requireAuth();

  const tokens = await db.apiToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      permissions: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return tokens;
}

export async function deleteApiToken(tokenId: string) {
  const userId = await requireAuth();

  const token = await db.apiToken.findFirst({
    where: { id: tokenId, userId },
  });

  if (!token) {
    throw new Error("Token not found");
  }

  await db.apiToken.delete({
    where: { id: tokenId },
  });

  await logAudit({
    userId,
    action: "DELETE_VARIABLE",
    resource: "API_TOKEN",
    resourceId: tokenId,
    metadata: { name: token.name },
  });

  revalidatePath("/dashboard/settings/api-tokens");
}

// Helper function to validate API token (used by API routes)
export async function validateApiToken(
  token: string
): Promise<{
  valid: boolean;
  userId?: string;
  permissions?: string[];
  error?: string;
}> {
  if (!token || !token.startsWith("sb_")) {
    return { valid: false, error: "Invalid token format" };
  }

  const tokenHash = hashToken(token);

  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      permissions: true,
      expiresAt: true,
    },
  });

  if (!apiToken) {
    return { valid: false, error: "Token not found" };
  }

  // Check expiration
  if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
    return { valid: false, error: "Token expired" };
  }

  // Update last used timestamp
  await db.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    userId: apiToken.userId,
    permissions: apiToken.permissions,
  };
}
