"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through environment -> project
  const environment = await db.environment.findFirst({
    where: { id: environmentId },
    include: { project: true },
  });

  if (!environment || environment.project.userId !== session.user.id) {
    throw new Error("Environment not found");
  }

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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const variable = await db.variable.findFirst({
    where: { id: variableId },
    include: { environment: { include: { project: true } } },
  });

  if (!variable || variable.environment.project.userId !== session.user.id) {
    throw new Error("Variable not found");
  }

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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const variable = await db.variable.findFirst({
    where: { id: variableId },
    include: { environment: { include: { project: true } } },
  });

  if (!variable || variable.environment.project.userId !== session.user.id) {
    throw new Error("Variable not found");
  }

  await db.variable.delete({
    where: { id: variableId },
  });

  revalidatePath(`/dashboard/projects/${variable.environment.projectId}`);
}

// Global Variables

export async function createGlobalVariable(data: EncryptedVariableData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const variable = await db.globalVariable.create({
    data: {
      userId: session.user.id,
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const variable = await db.globalVariable.findFirst({
    where: { id: variableId, userId: session.user.id },
  });

  if (!variable) {
    throw new Error("Variable not found");
  }

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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const variable = await db.globalVariable.findFirst({
    where: { id: variableId, userId: session.user.id },
  });

  if (!variable) {
    throw new Error("Variable not found");
  }

  await db.globalVariable.delete({
    where: { id: variableId },
  });

  revalidatePath("/dashboard/globals");
}

export async function getGlobalVariables() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return db.globalVariable.findMany({
    where: { userId: session.user.id },
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership of both
  const [global, project] = await Promise.all([
    db.globalVariable.findFirst({
      where: { id: globalId, userId: session.user.id },
    }),
    db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    }),
  ]);

  if (!global || !project) {
    throw new Error("Not found");
  }

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
