'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ALWAYS_OPEN, useGatedAction, type Gate } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface GatedLinkProps {
  href: string;
  /** The permission the DESTINATION ROUTE requires, from `route-map.ts`. */
  gate: Gate;
  children: React.ReactNode;
  className?: string;
  /** Names the destination in the access dialog. */
  subject?: string;
}

/**
 * A deep link that knows whether its destination will actually open.
 *
 * Business mode links across five modules, and each target route carries its
 * own gate — `/pipeline` needs `pipeline.view`, `/finance/receivables` needs
 * `finance.receivables.view`, not plain `finance.view`. A link that ignores
 * that still navigates, and the user lands on a permission wall having been
 * invited there by our own screen.
 *
 * So a blocked destination renders as a button that opens the access dialog
 * naming the permission, exactly as `DashboardRow` does one mode over.
 * `disabled` is deliberately not used: it would swallow the click that opens
 * the dialog.
 */
export function GatedLink({
  href,
  gate,
  children,
  className,
  subject,
}: GatedLinkProps): React.JSX.Element {
  const noop = React.useCallback(() => undefined, []);
  const { allowed, onGatedClick } = useGatedAction(gate, noop, subject);

  if (gate === ALWAYS_OPEN || allowed) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  // An anchor, not a button.
  //
  // Callers wrap block content — the headline tiles pass <div>s — and flow
  // content inside a <button> is invalid HTML, which React flags on hydration
  // and which breaks the button's implicit accessible name. An <a> accepts flow
  // content, so `role="button"` plus explicit keyboard handling gives the right
  // semantics without the invalid nesting.
  //
  // No `href`: there is nowhere to go. `tabIndex` restores focusability that an
  // href-less anchor loses, and Enter/Space are wired by hand because an anchor
  // does not activate on Space the way a button does.
  return (
    <a
      role="button"
      tabIndex={0}
      aria-disabled="true"
      onClick={onGatedClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onGatedClick();
        }
      }}
      className={cn(className, 'cursor-not-allowed')}
    >
      <Lock className="mr-1 inline size-3 align-[-1px]" aria-hidden="true" />
      {children}
    </a>
  );
}
