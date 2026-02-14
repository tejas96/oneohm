import { Suspense } from 'react';

import { OtpVerifyForm } from '@/components/features/auth';
import { Spinner } from '@/components/ui/spinner';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function OtpVerifyPage(): React.JSX.Element {
  return (
    <Suspense fallback={<Spinner size="lg" message="Loading..." />}>
      <OtpVerifyForm />
    </Suspense>
  );
}
