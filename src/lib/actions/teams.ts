"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export type TeamRole = "ADMIN" | "MEMBER" | "VIEWER";

interface CreateTeamInput {
  name: string;
}

interface InviteMemberInput {
  teamId: string;
  email: string;
  role: TeamRole;
}

export async function createTeam(data: CreateTeamInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const team = await db.team.create({
    data: {
      name: data.name,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
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
    userId: session.user.id,
    action: "CREATE_PROJECT",
    resource: "TEAM",
    resourceId: team.id,
  });

  revalidatePath("/dashboard/teams");

  return team;
}

export async function getTeams() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Get teams where user is owner or member
  const teams = await db.team.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin of the team
  const team = await db.team.findFirst({
    where: {
      id: data.teamId,
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
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
    userId: session.user.id,
    action: "UPDATE_PROJECT",
    resource: "TEAM",
    resourceId: data.teamId,
    metadata: { action: "invite_member", invitedUserId: user.id },
  });

  revalidatePath(`/dashboard/teams/${data.teamId}`);

  return member;
}

export async function removeMember(teamId: string, memberId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin of the team
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
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
    userId: session.user.id,
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin of the team
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin of the team and owns the project
  const [team, project] = await Promise.all([
    db.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { ownerId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                role: "ADMIN",
              },
            },
          },
        ],
      },
    }),
    db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    }),
  ]);

  if (!team || !project) {
    throw new Error("Team or project not found");
  }

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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin of the team
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Only owner can delete team
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      ownerId: session.user.id,
    },
  });

  if (!team) {
    throw new Error("Team not found or you're not the owner");
  }

  await db.team.delete({
    where: { id: teamId },
  });

  await logAudit({
    userId: session.user.id,
    action: "DELETE_PROJECT",
    resource: "TEAM",
    resourceId: teamId,
  });

  revalidatePath("/dashboard/teams");
}
