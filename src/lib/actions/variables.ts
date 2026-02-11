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

const KNOWN_ERRORS = ["Unauthorized", "Variable not found", "Environment not found", "Project not found"];

function isKnownError(error: unknown): boolean {
  return error instanceof Error && KNOWN_ERRORS.includes(error.message);
}

export async function createVariable(
  environmentId: string,
  data: EncryptedVariableData
) {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to create variable");
  }
}

export async function updateVariable(
  variableId: string,
  data: Partial<EncryptedVariableData>
) {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to update variable");
  }
}

export async function deleteVariable(variableId: string) {
  try {
    const userId = await requireAuth();
    const variable = await requireVariableOwnership(variableId, userId);

    await db.variable.delete({
      where: { id: variableId },
    });

    revalidatePath(`/dashboard/projects/${variable.environment.projectId}`);
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to delete variable");
  }
}

// Global Variables

export async function createGlobalVariable(data: EncryptedVariableData) {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to create global variable");
  }
}

export async function updateGlobalVariable(
  variableId: string,
  data: Partial<EncryptedVariableData>
) {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to update global variable");
  }
}

export async function deleteGlobalVariable(variableId: string) {
  try {
    const userId = await requireAuth();
    await requireGlobalVariableOwnership(variableId, userId);

    await db.globalVariable.delete({
      where: { id: variableId },
    });

    revalidatePath("/dashboard/globals");
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to delete global variable");
  }
}

export async function getGlobalVariables() {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to load global variables");
  }
}

export async function linkGlobalToProject(
  globalId: string,
  projectId: string
) {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to link variable to project");
  }
}

export async function unlinkGlobalFromProject(
  globalId: string,
  projectId: string
) {
  try {
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
  } catch (error) {
    if (isKnownError(error)) throw error;
    throw new Error("Failed to unlink variable from project");
  }
}
