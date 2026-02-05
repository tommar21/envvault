import { db } from "@/lib/db";
import { authenticateApiRequest, hasPermission, apiError, apiSuccess } from "@/lib/api-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/projects/:id
 * Get a specific project with all environments and encrypted variables
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "READ")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    const project = await db.project.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
      include: {
        environments: {
          include: {
            variables: {
              select: {
                id: true,
                keyEncrypted: true,
                valueEncrypted: true,
                ivKey: true,
                ivValue: true,
                isSecret: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return apiError("Project not found", 404);
    }

    return apiSuccess({
      project: {
        id: project.id,
        name: project.name,
        path: project.path,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        environments: project.environments.map((env) => ({
          id: env.id,
          name: env.name,
          variables: env.variables.map((v) => ({
            id: v.id,
            keyEncrypted: v.keyEncrypted,
            valueEncrypted: v.valueEncrypted,
            ivKey: v.ivKey,
            ivValue: v.ivValue,
            isSecret: v.isSecret,
            createdAt: v.createdAt.toISOString(),
            updatedAt: v.updatedAt.toISOString(),
          })),
        })),
      },
    });
  } catch {
    return apiError("Failed to fetch project", 500);
  }
}

/**
 * DELETE /api/v1/projects/:id
 * Delete a project
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "WRITE")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    const project = await db.project.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (!project) {
      return apiError("Project not found", 404);
    }

    await db.project.delete({
      where: { id },
    });

    return apiSuccess({ message: "Project deleted" });
  } catch {
    return apiError("Failed to delete project", 500);
  }
}
