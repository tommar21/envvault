"use server";

import { requireAuth } from "@/lib/auth-helpers";
import { getAuditLogs, type AuditAction } from "@/lib/audit";

export async function fetchAuditLogs(options?: {
  limit?: number;
  offset?: number;
  actions?: AuditAction[];
}) {
  try {
    const userId = await requireAuth();
    const { limit = 50, offset = 0, actions } = options || {};

    const logs = await getAuditLogs(userId, { limit, offset });

    // Filter by action category if provided
    const filtered = actions
      ? logs.filter((log) => actions.includes(log.action as AuditAction))
      : logs;

    return filtered;
  } catch {
    throw new Error("Failed to fetch audit logs");
  }
}
