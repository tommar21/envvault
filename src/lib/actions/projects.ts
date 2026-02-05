"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireAuth,
  requireProjectOwnership,
  requireEnvironmentOwnership,
} from "@/lib/auth-helpers";

export async function createProject(data: { name: string; path?: string }) {
  const userId = await requireAuth();

  const project = await db.project.create({
    data: {
      userId,
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
  const userId = await requireAuth();
  await requireProjectOwnership(projectId, userId);

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
  const userId = await requireAuth();
  await requireProjectOwnership(projectId, userId);

  await db.project.delete({
    where: { id: projectId },
  });

  revalidatePath("/dashboard");
}

export async function getProject(projectId: string) {
  const userId = await requireAuth();

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
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
  const userId = await requireAuth();
  await requireProjectOwnership(projectId, userId);

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
  const userId = await requireAuth();
  const environment = await requireEnvironmentOwnership(environmentId, userId);

  await db.environment.delete({
    where: { id: environmentId },
  });

  revalidatePath(`/dashboard/projects/${environment.projectId}`);
}
