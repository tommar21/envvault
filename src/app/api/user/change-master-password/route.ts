import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const reEncryptedVariableSchema = z.object({
  id: z.string().min(1),
  keyEncrypted: z.string().min(1),
  valueEncrypted: z.string().min(1),
  ivKey: z.string().min(1),
  ivValue: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPasswordHash: z.string().min(1),
  newMasterPasswordHash: z.string().min(1),
  newSalt: z.string().min(1),
  variables: z.array(reEncryptedVariableSchema),
  globalVariables: z.array(reEncryptedVariableSchema),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = changePasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Verify current user
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        masterPassword: true,
        encryptionSalt: true,
      },
    });

    if (!user || !user.masterPassword) {
      return NextResponse.json(
        { error: "User not found or master password not set" },
        { status: 400 }
      );
    }

    // Verify current password hash matches
    const isCurrentPasswordValid = await bcrypt.compare(
      body.currentPasswordHash,
      user.masterPassword
    );

    if (!isCurrentPasswordValid) {
      // Log failed attempt
      await logAudit({
        userId: session.user.id,
        action: "CHANGE_MASTER_PASSWORD",
        resource: "SETTINGS",
        metadata: { success: false, reason: "invalid_current_password" },
        request: req,
      });

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash the new master password
    const newHashedPassword = await bcrypt.hash(body.newMasterPasswordHash, 12);

    // Verify ownership of all variables before updating
    if (body.variables.length > 0) {
      const variableIds = body.variables.map((v) => v.id);
      const ownedVariables = await db.variable.findMany({
        where: {
          id: { in: variableIds },
          environment: { project: { userId: session.user.id } },
        },
        select: { id: true },
      });
      const ownedIds = new Set(ownedVariables.map((v) => v.id));
      const unauthorized = variableIds.filter((id) => !ownedIds.has(id));
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: "Unauthorized variable access" },
          { status: 403 }
        );
      }
    }

    if (body.globalVariables.length > 0) {
      const globalIds = body.globalVariables.map((v) => v.id);
      const ownedGlobals = await db.globalVariable.findMany({
        where: {
          id: { in: globalIds },
          userId: session.user.id,
        },
        select: { id: true },
      });
      const ownedGlobalIds = new Set(ownedGlobals.map((v) => v.id));
      const unauthorized = globalIds.filter((id) => !ownedGlobalIds.has(id));
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: "Unauthorized variable access" },
          { status: 403 }
        );
      }
    }

    // Update everything in a transaction
    await db.$transaction(async (tx) => {
      // Update user with new salt and hashed password
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          masterPassword: newHashedPassword,
          encryptionSalt: body.newSalt,
        },
      });

      // Update all variables with re-encrypted data
      for (const variable of body.variables) {
        await tx.variable.update({
          where: { id: variable.id },
          data: {
            keyEncrypted: variable.keyEncrypted,
            valueEncrypted: variable.valueEncrypted,
            ivKey: variable.ivKey,
            ivValue: variable.ivValue,
          },
        });
      }

      // Update all global variables with re-encrypted data
      for (const globalVar of body.globalVariables) {
        await tx.globalVariable.update({
          where: { id: globalVar.id },
          data: {
            keyEncrypted: globalVar.keyEncrypted,
            valueEncrypted: globalVar.valueEncrypted,
            ivKey: globalVar.ivKey,
            ivValue: globalVar.ivValue,
          },
        });
      }
    });

    // Log successful password change
    await logAudit({
      userId: session.user.id,
      action: "CHANGE_MASTER_PASSWORD",
      resource: "SETTINGS",
      metadata: {
        success: true,
        variablesReencrypted: body.variables.length,
        globalVariablesReencrypted: body.globalVariables.length,
      },
      request: req,
    });

    return NextResponse.json({
      success: true,
      message: "Master password changed successfully",
      newSalt: body.newSalt,
    });
  } catch (error) {
    logger.error("Change master password error", error);
    return NextResponse.json(
      { error: "Failed to change master password" },
      { status: 500 }
    );
  }
}
