import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Require authentication and return user ID
 * Throws if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

/**
 * Require authentication and return full session
 * Throws if not authenticated
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Verify project ownership and return the project
 * Throws if project not found or user doesn't own it
 */
export async function requireProjectOwnership(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    throw new Error("Project not found");
  }
  return project;
}

/**
 * Verify environment ownership through project
 * Returns the environment with its project
 */
export async function requireEnvironmentOwnership(environmentId: string, userId: string) {
  const environment = await db.environment.findFirst({
    where: {
      id: environmentId,
      project: { userId },
    },
    include: { project: true },
  });
  if (!environment) {
    throw new Error("Environment not found");
  }
  return environment;
}

/**
 * Verify team membership and return role
 * Throws if user is not a member
 */
export async function requireTeamMembership(teamId: string, userId: string) {
  const membership = await db.teamMember.findFirst({
    where: { teamId, userId },
  });
  if (!membership) {
    throw new Error("Not a team member");
  }
  return membership;
}

/**
 * Verify team admin role
 * Throws if user is not an admin
 */
export async function requireTeamAdmin(teamId: string, userId: string) {
  const membership = await requireTeamMembership(teamId, userId);
  if (membership.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return membership;
}

/**
 * Verify variable ownership through environment -> project chain
 * Returns the variable with environment and project
 */
export async function requireVariableOwnership(variableId: string, userId: string) {
  const variable = await db.variable.findFirst({
    where: { id: variableId },
    include: { environment: { include: { project: true } } },
  });
  if (!variable || variable.environment.project.userId !== userId) {
    throw new Error("Variable not found");
  }
  return variable;
}

/**
 * Verify global variable ownership
 * Returns the global variable
 */
export async function requireGlobalVariableOwnership(globalId: string, userId: string) {
  const global = await db.globalVariable.findFirst({
    where: { id: globalId, userId },
  });
  if (!global) {
    throw new Error("Variable not found");
  }
  return global;
}
