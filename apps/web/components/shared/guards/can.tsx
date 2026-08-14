'use client';

import type { ReactNode } from 'react';

import { useCan, type Gate } from '@/lib/rbac';

interface CanProps {
  /** A gate, or several. */
  permission: Gate | Gate[];
  /** When true, require ALL gates (default: any-of) */
  all?: boolean;
  /** Content to render when the gate opens */
  children: ReactNode;
  /** Content to render when it does not (default: null / hidden) */
  fallback?: ReactNode;
  /** Render children blurred instead of hiding them */
  blur?: boolean;
}

/**
 * Declarative inline gate for a piece of UI.
 *
 * Use this for **content** — pricing blocks, margin figures, anything whose
 * value is the information itself. Content hides silently: there is nothing to
 * click, so a dialog explaining what is missing would be noise, and a visible
 * placeholder just advertises the number being withheld.
 *
 * For **actions** — buttons, menu items — prefer `useCan()` plus
 * `useAccessDialog()`, so the control stays visible but disabled and clicking
 * it explains what permission is needed. A user who cannot see a button cannot
 * know to ask for it.
 *
 * @example
 * <Can permission="quotes.profitability">
 *   <PricingSummary />
 * </Can>
 */
export function Can({
  permission,
  all = false,
  children,
  fallback = null,
  blur = false,
}: CanProps): React.JSX.Element | null {
  const { can } = useCan();

  const gates = Array.isArray(permission) ? permission : [permission];
  const granted = all ? gates.every((g) => can(g)) : gates.some((g) => can(g));

  if (granted) {
    return <>{children}</>;
  }

  if (blur) {
    return (
      <div className="relative select-none" aria-hidden="true">
        <div className="pointer-events-none blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground-secondary backdrop-blur-sm">
            Restricted
          </span>
        </div>
      </div>
    );
  }

  return <>{fallback}</>;
}
