import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest, hasPermission, apiError, apiSuccess } from "@/lib/api-auth";

/**
 * GET /api/v1/projects
 * List all projects for the authenticated user
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "READ")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    const projects = await db.project.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        path: true,
        createdAt: true,
        updatedAt: true,
        environments: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { variables: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return apiSuccess({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        environments: p.environments.map((e) => ({
          id: e.id,
          name: e.name,
          variableCount: e._count.variables,
        })),
      })),
    });
  } catch {
    return apiError("Failed to fetch projects", 500);
  }
}

/**
 * POST /api/v1/projects
 * Create a new project
 */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);

  if (!auth.authorized) {
    return apiError(auth.error || "Unauthorized", 401);
  }

  if (!hasPermission(auth.permissions, "WRITE")) {
    return apiError("Insufficient permissions", 403);
  }

  try {
    const body = await request.json();
    const { name, path, environments } = body;

    if (!name || typeof name !== "string") {
      return apiError("Project name is required");
    }

    // Default environments if not provided
    const envNames = environments && Array.isArray(environments)
      ? environments
      : ["development", "staging", "production"];

    const project = await db.project.create({
      data: {
        name,
        path: path || null,
        userId: auth.userId!,
        environments: {
          create: envNames.map((envName: string) => ({
            name: envName,
          })),
        },
      },
      include: {
        environments: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return apiSuccess(
      {
        project: {
          id: project.id,
          name: project.name,
          path: project.path,
          createdAt: project.createdAt.toISOString(),
          environments: project.environments,
        },
      },
      201
    );
  } catch {
    return apiError("Failed to create project", 500);
  }
}
