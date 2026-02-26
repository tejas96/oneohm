import { ProjectDetailPage } from '@/components/features/projects';

interface PageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function ProjectDetail({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ProjectDetailPage projectId={id} />;
}
