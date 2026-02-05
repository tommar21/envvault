"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAuth, requireProjectOwnership } from "@/lib/auth-helpers";

export type TeamRole = "ADMIN" | "MEMBER" | "VIEWER";

interface CreateTeamInput {
  name: string;
}

interface InviteMemberInput {
  teamId: string;
  email: string;
  role: TeamRole;
}

/**
 * Helper to verify team admin access
 */
async function requireTeamAdminAccess(teamId: string, userId: string) {
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
              role: "ADMIN",
            },
          },
        },
      ],
    },
  });

  if (!team) {
    throw new Error("Team not found or you don't have permission");
  }

  return team;
}

/**
 * Helper to verify team membership (any role)
 */
async function requireTeamMemberAccess(teamId: string, userId: string) {
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}

export async function createTeam(data: CreateTeamInput) {
  const userId = await requireAuth();

  const team = await db.team.create({
    data: {
      name: data.name,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  await logAudit({
    userId,
    action: "CREATE_PROJECT",
    resource: "TEAM",
    resourceId: team.id,
  });

  revalidatePath("/dashboard/teams");

  return team;
}

export async function getTeams() {
  const userId = await requireAuth();

  const teams = await db.team.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      projects: {
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: { members: true, projects: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return teams;
}

export async function getTeam(teamId: string) {
  const userId = await requireAuth();
  await requireTeamMemberAccess(teamId, userId);

  const team = await db.team.findFirst({
    where: { id: teamId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      projects: {
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}

export async function inviteMember(data: InviteMemberInput) {
  const userId = await requireAuth();
  await requireTeamAdminAccess(data.teamId, userId);

  // Find user by email
  const user = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found with this email");
  }

  // Check if already a member
  const existingMember = await db.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: data.teamId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    throw new Error("User is already a member of this team");
  }

  const member = await db.teamMember.create({
    data: {
      teamId: data.teamId,
      userId: user.id,
      role: data.role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await logAudit({
    userId,
    action: "UPDATE_PROJECT",
    resource: "TEAM",
    resourceId: data.teamId,
    metadata: { action: "invite_member", invitedUserId: user.id },
  });

  revalidatePath(`/dashboard/teams/${data.teamId}`);

  return member;
}

export async function removeMember(teamId: string, memberId: string) {
  const userId = await requireAuth();
  const team = await requireTeamAdminAccess(teamId, userId);

  // Can't remove the owner
  const member = await db.teamMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.userId === team.ownerId) {
    throw new Error("Cannot remove the team owner");
  }

  await db.teamMember.delete({
    where: { id: memberId },
  });

  await logAudit({
    userId,
    action: "UPDATE_PROJECT",
    resource: "TEAM",
    resourceId: teamId,
    metadata: { action: "remove_member", removedUserId: member.userId },
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
}

export async function updateMemberRole(
  teamId: string,
  memberId: string,
  role: TeamRole
) {
  const userId = await requireAuth();
  await requireTeamAdminAccess(teamId, userId);

  const member = await db.teamMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  revalidatePath(`/dashboard/teams/${teamId}`);

  return member;
}

export async function linkProjectToTeam(teamId: string, projectId: string) {
  const userId = await requireAuth();

  // Verify user is admin of the team and owns the project
  await Promise.all([
    requireTeamAdminAccess(teamId, userId),
    requireProjectOwnership(projectId, userId),
  ]);

  await db.teamProject.create({
    data: {
      teamId,
      projectId,
    },
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function unlinkProjectFromTeam(teamId: string, projectId: string) {
  const userId = await requireAuth();
  await requireTeamAdminAccess(teamId, userId);

  await db.teamProject.delete({
    where: {
      teamId_projectId: {
        teamId,
        projectId,
      },
    },
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteTeam(teamId: string) {
  const userId = await requireAuth();

  // Only owner can delete team
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      ownerId: userId,
    },
  });

  if (!team) {
    throw new Error("Team not found or you're not the owner");
  }

  await db.team.delete({
    where: { id: teamId },
  });

  await logAudit({
    userId,
    action: "DELETE_PROJECT",
    resource: "TEAM",
    resourceId: teamId,
  });

  revalidatePath("/dashboard/teams");
}
