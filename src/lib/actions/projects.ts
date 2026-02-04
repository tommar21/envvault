"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProject(data: { name: string; path?: string }) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.create({
    data: {
      userId: session.user.id,
      name: data.name,
      path: data.path || null,
      environments: {
        create: [
          { name: "development" },
          { name: "staging" },
          { name: "production" },
        ],
      },
    },
    include: {
      environments: true,
    },
  });

  revalidatePath("/dashboard");

  return project;
}

export async function updateProject(
  projectId: string,
  data: { name?: string; path?: string }
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!existing) {
    throw new Error("Project not found");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      name: data.name,
      path: data.path,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}`);

  return project;
}

export async function deleteProject(projectId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!existing) {
    throw new Error("Project not found");
  }

  await db.project.delete({
    where: { id: projectId },
  });

  revalidatePath("/dashboard");
}

export async function getProject(projectId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: {
      environments: {
        include: {
          variables: true,
        },
        orderBy: {
          name: "asc",
        },
      },
      linkedGlobals: {
        include: {
          global: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
}

export async function createEnvironment(projectId: string, name: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const environment = await db.environment.create({
    data: {
      projectId,
      name,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);

  return environment;
}

export async function deleteEnvironment(environmentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through project
  const environment = await db.environment.findFirst({
    where: { id: environmentId },
    include: { project: true },
  });

  if (!environment || environment.project.userId !== session.user.id) {
    throw new Error("Environment not found");
  }

  await db.environment.delete({
    where: { id: environmentId },
  });

  revalidatePath(`/dashboard/projects/${environment.projectId}`);
}
