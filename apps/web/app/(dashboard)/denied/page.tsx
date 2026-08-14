'use client';

import { usePathname } from 'next/navigation';

import { AccessDeniedContent, ALWAYS_OPEN } from '@/lib/rbac';
import { gateForPath } from '@/lib/rbac/route-map';

/**
 * Where `middleware.ts` rewrites a blocked URL.
 *
 * The gate is derived from the pathname, **not** from a query parameter.
 * A rewrite keeps the browser URL as the page the user asked for, and
 * `useSearchParams()` reads that browser URL — so any `?perm=` the middleware
 * put on the rewrite target is invisible here. Reading the path is both
 * simpler and always correct: it is the same lookup the middleware just did.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function DeniedPage(): React.JSX.Element {
  const pathname = usePathname();
  const gate = gateForPath(pathname);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      {gate === ALWAYS_OPEN ? (
        // Reached /denied directly rather than by rewrite, so there is no
        // specific permission to name. Say so plainly instead of guessing.
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-1 text-xl font-semibold text-foreground">Access needed</h2>
          <p className="text-sm text-foreground-secondary">
            You do not have access to that page. Ask a superadmin to grant it.
          </p>
        </div>
      ) : (
        <AccessDeniedContent gate={gate} />
      )}
    </div>
  );
}
