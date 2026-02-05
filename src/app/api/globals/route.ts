import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const globals = await db.globalVariable.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        keyEncrypted: true,
        valueEncrypted: true,
        ivKey: true,
        ivValue: true,
        isSecret: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(globals);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch global variables" },
      { status: 500 }
    );
  }
}
