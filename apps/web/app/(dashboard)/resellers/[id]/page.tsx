import { ResellerDetailPage } from '@/components/features/resellers';

interface PageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function ResellerDetail({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ResellerDetailPage id={id} />;
}
