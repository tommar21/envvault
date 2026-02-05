"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireAuth,
  requireEnvironmentOwnership,
  requireVariableOwnership,
  requireGlobalVariableOwnership,
  requireProjectOwnership,
} from "@/lib/auth-helpers";

interface EncryptedVariableData {
  keyEncrypted: string;
  valueEncrypted: string;
  ivKey: string;
  ivValue: string;
  isSecret: boolean;
}

export async function createVariable(
  environmentId: string,
  data: EncryptedVariableData
) {
  const userId = await requireAuth();
  const environment = await requireEnvironmentOwnership(environmentId, userId);

  const variable = await db.variable.create({
    data: {
      environmentId,
      keyEncrypted: data.keyEncrypted,
      valueEncrypted: data.valueEncrypted,
      ivKey: data.ivKey,
      ivValue: data.ivValue,
      isSecret: data.isSecret,
    },
  });

  revalidatePath(`/dashboard/projects/${environment.projectId}`);

  return variable;
}

export async function updateVariable(
  variableId: string,
  data: Partial<EncryptedVariableData>
) {
  const userId = await requireAuth();
  const variable = await requireVariableOwnership(variableId, userId);

  const updated = await db.variable.update({
    where: { id: variableId },
    data: {
      keyEncrypted: data.keyEncrypted,
      valueEncrypted: data.valueEncrypted,
      ivKey: data.ivKey,
      ivValue: data.ivValue,
      isSecret: data.isSecret,
    },
  });

  revalidatePath(`/dashboard/projects/${variable.environment.projectId}`);

  return updated;
}

export async function deleteVariable(variableId: string) {
  const userId = await requireAuth();
  const variable = await requireVariableOwnership(variableId, userId);

  await db.variable.delete({
    where: { id: variableId },
  });

  revalidatePath(`/dashboard/projects/${variable.environment.projectId}`);
}

// Global Variables

export async function createGlobalVariable(data: EncryptedVariableData) {
  const userId = await requireAuth();

  const variable = await db.globalVariable.create({
    data: {
      userId,
      keyEncrypted: data.keyEncrypted,
      valueEncrypted: data.valueEncrypted,
      ivKey: data.ivKey,
      ivValue: data.ivValue,
      isSecret: data.isSecret,
    },
  });

  revalidatePath("/dashboard/globals");

  return variable;
}

export async function updateGlobalVariable(
  variableId: string,
  data: Partial<EncryptedVariableData>
) {
  const userId = await requireAuth();
  await requireGlobalVariableOwnership(variableId, userId);

  const updated = await db.globalVariable.update({
    where: { id: variableId },
    data: {
      keyEncrypted: data.keyEncrypted,
      valueEncrypted: data.valueEncrypted,
      ivKey: data.ivKey,
      ivValue: data.ivValue,
      isSecret: data.isSecret,
    },
  });

  revalidatePath("/dashboard/globals");

  return updated;
}

export async function deleteGlobalVariable(variableId: string) {
  const userId = await requireAuth();
  await requireGlobalVariableOwnership(variableId, userId);

  await db.globalVariable.delete({
    where: { id: variableId },
  });

  revalidatePath("/dashboard/globals");
}

export async function getGlobalVariables() {
  const userId = await requireAuth();

  return db.globalVariable.findMany({
    where: { userId },
    include: {
      projects: {
        include: {
          project: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function linkGlobalToProject(
  globalId: string,
  projectId: string
) {
  const userId = await requireAuth();

  // Verify ownership of both
  await Promise.all([
    requireGlobalVariableOwnership(globalId, userId),
    requireProjectOwnership(projectId, userId),
  ]);

  await db.projectGlobal.create({
    data: {
      projectId,
      globalId,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/globals");
}

export async function unlinkGlobalFromProject(
  globalId: string,
  projectId: string
) {
  const userId = await requireAuth();
  await requireProjectOwnership(projectId, userId);

  await db.projectGlobal.delete({
    where: {
      projectId_globalId: {
        projectId,
        globalId,
      },
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/globals");
}
