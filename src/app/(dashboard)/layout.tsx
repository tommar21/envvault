import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch projects for search command
  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: 10, // Limit for performance
  });

  return (
    <DashboardShell
      user={{
        name: session.user?.name,
        email: session.user?.email,
      }}
      projects={projects}
    >
      {children}
    </DashboardShell>
  );
}
