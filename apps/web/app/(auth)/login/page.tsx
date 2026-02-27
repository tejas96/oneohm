import { Suspense } from 'react';

import { LoginForm } from '@/components/features/auth';
import { Spinner } from '@/components/ui/spinner';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<Spinner size="lg" message="Loading..." />}>
      <LoginForm />
    </Suspense>
  );
}
