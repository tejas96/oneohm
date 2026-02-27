import { PropertyFormPage } from '@/components/features/properties';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function NewPropertyRoute(): React.JSX.Element {
  return <PropertyFormPage mode="create" />;
}
