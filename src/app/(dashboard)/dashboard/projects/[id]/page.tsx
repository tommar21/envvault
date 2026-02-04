import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { ProjectView } from "@/components/project-view";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  try {
    const project = await getProject(id);
    return <ProjectView project={project} />;
  } catch {
    notFound();
  }
}
