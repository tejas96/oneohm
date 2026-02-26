'use client';

import { ProjectDetailContent } from './project-detail';

interface ProjectDetailPageProps {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps): React.JSX.Element {
  return <ProjectDetailContent projectId={projectId} />;
}
