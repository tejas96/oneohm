import { PropertyFormPage } from '@/components/features/properties';

interface PageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function AddPropertyRoute({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <PropertyFormPage mode="create" customerId={id} />;
}
