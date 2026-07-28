import { OnboardingWizardPage } from '@/components/features/onboarding';

interface PageProps {
  searchParams: Promise<{ customerId?: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function OnboardingNewRoute({
  searchParams,
}: PageProps): Promise<React.JSX.Element> {
  const { customerId } = await searchParams;
  return (
    <OnboardingWizardPage mode={customerId ? 'create-site' : 'create'} customerId={customerId} />
  );
}
