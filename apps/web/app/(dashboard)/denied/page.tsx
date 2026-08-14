'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { AccessDeniedContent, PERMISSION_BY_CODE, SUPERADMIN_ONLY, type Gate } from '@/lib/rbac';

/**
 * Where `middleware.ts` rewrites a blocked URL.
 *
 * A rewrite, not a redirect, so the address bar still shows what the user
 * typed — they can see which page they were refused, and the URL stays
 * shareable when they ask a superadmin for access.
 */
function DeniedContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const perm = searchParams.get('perm');

  // The query string is user-editable, so treat it as untrusted: only render
  // a gate we actually recognise, and fall back to something honest otherwise.
  const gate: Gate | null =
    perm && PERMISSION_BY_CODE.has(perm) ? (perm as Gate) : perm === null ? SUPERADMIN_ONLY : null;

  if (gate === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-1 text-xl font-semibold text-foreground">Access needed</h2>
        <p className="text-sm text-foreground-secondary">
          You do not have access to this page. Ask a superadmin to grant it.
        </p>
      </div>
    );
  }

  return <AccessDeniedContent gate={gate} />;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function DeniedPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      {/* useSearchParams needs a Suspense boundary or the production build fails. */}
      <Suspense fallback={null}>
        <DeniedContent />
      </Suspense>
    </div>
  );
}
