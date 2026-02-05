import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { ProjectView } from "@/components/project-view";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const project = await getProject(id).catch(() => null);

  if (!project) {
    notFound();
  }

  return <ProjectView project={project} />;
}
