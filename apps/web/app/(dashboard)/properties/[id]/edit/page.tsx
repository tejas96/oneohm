import { OnboardingWizardPage } from '@/components/features/onboarding';

interface PageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function PropertyEditRoute({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <OnboardingWizardPage mode="edit-property" propertyId={id} />;
}
