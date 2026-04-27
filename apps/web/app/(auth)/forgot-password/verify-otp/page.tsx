import { Suspense } from 'react';

import { ForgotPasswordOtpForm } from '@/components/features/auth';
import { Spinner } from '@/components/ui/spinner';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function ForgotPasswordVerifyOtpPage(): React.JSX.Element {
  return (
    <Suspense fallback={<Spinner size="lg" message="Loading..." />}>
      <ForgotPasswordOtpForm />
    </Suspense>
  );
}
