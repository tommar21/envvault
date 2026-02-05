import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "UNLOCK_VAULT"
  | "UNLOCK_FAILED"
  | "LOCK_VAULT"
  | "CREATE_PROJECT"
  | "UPDATE_PROJECT"
  | "DELETE_PROJECT"
  | "CREATE_VARIABLE"
  | "UPDATE_VARIABLE"
  | "DELETE_VARIABLE"
  | "CREATE_GLOBAL"
  | "UPDATE_GLOBAL"
  | "DELETE_GLOBAL"
  | "EXPORT_ENV"
  | "IMPORT_ENV"
  | "ENABLE_2FA"
  | "DISABLE_2FA"
  | "CHANGE_MASTER_PASSWORD"
  | "REGISTER";

export type AuditResource =
  | "USER"
  | "PROJECT"
  | "ENVIRONMENT"
  | "VARIABLE"
  | "GLOBAL_VARIABLE"
  | "SETTINGS"
  | "TEAM"
  | "API_TOKEN";

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

/**
 * Log an audit event
 */
export async function logAudit({
  userId,
  action,
  resource,
  resourceId,
  metadata,
  request,
}: AuditLogParams): Promise<void> {
  try {
    // Extract IP and user agent from request
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      const forwarded = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      ipAddress = forwarded?.split(",")[0].trim() || realIp || null;
      userAgent = request.headers.get("user-agent");
    }

    await db.auditLog.create({
      data: {
        userId,
        action,
        resource: resource || null,
        resourceId: resourceId || null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    // But log prominently for monitoring/alerting
    logger.error("CRITICAL: Failed to create audit log - this may indicate database issues", error);

    // In production, you may want to send this to an external alerting service
    if (process.env.NODE_ENV === "production") {
      // Log additional context for debugging
      console.error("[AUDIT_FAILURE]", {
        userId,
        action,
        resource,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

/**
 * Get recent audit logs for a user
 */
export async function getAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
  }
) {
  const { limit = 50, offset = 0, action } = options || {};

  return db.auditLog.findMany({
    where: {
      userId,
      ...(action && { action }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get security-related audit logs (login attempts, 2FA changes, etc.)
 */
export async function getSecurityLogs(userId: string, limit: number = 20) {
  const securityActions: AuditAction[] = [
    "LOGIN",
    "LOGIN_FAILED",
    "LOGOUT",
    "UNLOCK_VAULT",
    "UNLOCK_FAILED",
    "ENABLE_2FA",
    "DISABLE_2FA",
    "CHANGE_MASTER_PASSWORD",
  ];

  return db.auditLog.findMany({
    where: {
      userId,
      action: { in: securityActions },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
