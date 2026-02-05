"use server";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

interface ChangePasswordRequest {
  currentPasswordHash: string; // Hash of current password for verification
  newMasterPasswordHash: string; // Hash of new password to store
  newSalt: string; // New salt for key derivation
  variables: Array<{
    id: string;
    keyEncrypted: string;
    valueEncrypted: string;
    ivKey: string;
    ivValue: string;
  }>;
  globalVariables: Array<{
    id: string;
    keyEncrypted: string;
    valueEncrypted: string;
    ivKey: string;
    ivValue: string;
  }>;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChangePasswordRequest = await req.json();

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
