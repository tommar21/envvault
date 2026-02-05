import { db } from "@/lib/db";
import { authenticateApiRequest, hasPermission, apiError, apiSuccess } from "@/lib/api-auth";

interface RouteParams {
  params: Promise<{ id: string; envId: string }>;
}

/**
 * GET /api/v1/projects/:id/environments/:envId/variables
 * Get all encrypted variables for an environment
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id, envId } = await params;
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "READ")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    // Verify project ownership and environment exists
    const environment = await db.environment.findFirst({
      where: {
        id: envId,
        projectId: id,
        project: {
          userId: auth.userId,
        },
      },
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
        project: {
          select: { name: true },
        },
      },
    });

    if (!environment) {
      return apiError("Environment not found", 404);
    }

    return apiSuccess({
      projectName: environment.project.name,
      environmentName: environment.name,
      variables: environment.variables.map((v) => ({
        id: v.id,
        keyEncrypted: v.keyEncrypted,
        valueEncrypted: v.valueEncrypted,
        ivKey: v.ivKey,
        ivValue: v.ivValue,
        isSecret: v.isSecret,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
    });
  } catch {
    return apiError("Failed to fetch variables", 500);
  }
}

/**
 * POST /api/v1/projects/:id/environments/:envId/variables
 * Create a new encrypted variable
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id, envId } = await params;
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "WRITE")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    const body = await request.json();
    const { keyEncrypted, valueEncrypted, ivKey, ivValue, isSecret } = body;

    // Validate required fields
    if (!keyEncrypted || !valueEncrypted || !ivKey || !ivValue) {
      return apiError("Missing required encrypted fields");
    }

    // Verify project ownership and environment exists
    const environment = await db.environment.findFirst({
      where: {
        id: envId,
        projectId: id,
        project: {
          userId: auth.userId,
        },
      },
    });

    if (!environment) {
      return apiError("Environment not found", 404);
    }

    const variable = await db.variable.create({
      data: {
        environmentId: envId,
        keyEncrypted,
        valueEncrypted,
        ivKey,
        ivValue,
        isSecret: isSecret ?? false,
      },
    });

    return apiSuccess(
      {
        variable: {
          id: variable.id,
          keyEncrypted: variable.keyEncrypted,
          valueEncrypted: variable.valueEncrypted,
          ivKey: variable.ivKey,
          ivValue: variable.ivValue,
          isSecret: variable.isSecret,
          createdAt: variable.createdAt.toISOString(),
        },
      },
      201
    );
  } catch {
    return apiError("Failed to create variable", 500);
  }
}

/**
 * PUT /api/v1/projects/:id/environments/:envId/variables
 * Bulk update/replace all variables in an environment
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id, envId } = await params;
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "WRITE")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    const body = await request.json();
    const { variables } = body;

    if (!Array.isArray(variables)) {
      return apiError("Variables must be an array");
    }

    // Verify project ownership and environment exists
    const environment = await db.environment.findFirst({
      where: {
        id: envId,
        projectId: id,
        project: {
          userId: auth.userId,
        },
      },
    });

    if (!environment) {
      return apiError("Environment not found", 404);
    }

    // Replace all variables in a transaction
    await db.$transaction(async (tx) => {
      // Delete existing variables
      await tx.variable.deleteMany({
        where: { environmentId: envId },
      });

      // Create new variables
      if (variables.length > 0) {
        await tx.variable.createMany({
          data: variables.map((v: {
            keyEncrypted: string;
            valueEncrypted: string;
            ivKey: string;
            ivValue: string;
            isSecret?: boolean;
          }) => ({
            environmentId: envId,
            keyEncrypted: v.keyEncrypted,
            valueEncrypted: v.valueEncrypted,
            ivKey: v.ivKey,
            ivValue: v.ivValue,
            isSecret: v.isSecret ?? false,
          })),
        });
      }
    });

    return apiSuccess({
      message: "Variables updated",
      count: variables.length,
    });
  } catch {
    return apiError("Failed to update variables", 500);
  }
}
