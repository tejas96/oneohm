'use client';

import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Internal cross-reference link used throughout inventory cards/tables
 * (e.g. PO -> Vendor, Dispatch -> Allocation -> PO). Renders an inline
 * link with a subtle "open in" affordance.
 *
 * Decisions:
 *   * v1 has NO hover preview card — the plan calls that out explicitly.
 *     Doing previews properly requires a portal layer + per-entity
 *     summary endpoints; not worth shipping half-baked.
 *   * Always uses next/link so app-router prefetching kicks in.
 *   * Caller passes the resolved label and href; this component does
 *     not assume a URL convention. That keeps the link surface
 *     refactor-friendly (e.g. moving /vendors -> /partners).
 *   * `external` flag opens in a new tab with the right rel attrs.
 *     Used for things like a vendor's website on a vendor card.
 */

export type EntityType =
  | 'product'
  | 'vendor'
  | 'warehouse'
  | 'purchase-order'
  | 'dispatch'
  | 'allocation'
  | 'project'
  | 'transaction'
  | 'user'
  | 'generic';

export interface EntityLinkProps {
  href: string;
  label: string;
  /** Optional secondary text shown small after the label (e.g. PO code). */
  secondary?: string;
  /** Visual hint about what kind of entity this is — currently used for the icon trailing the label, if any. */
  type?: EntityType;
  /** Open in a new tab. */
  external?: boolean;
  /** Disable the link styling and render plain text (useful when caller doesn't have permission to view the target). */
  disabled?: boolean;
  /** Extra title / aria-label override. */
  title?: string;
  className?: string;
}

export function EntityLink({
  href,
  label,
  secondary,
  external,
  disabled,
  title,
  className,
}: EntityLinkProps): React.JSX.Element {
  if (disabled) {
    return (
      <span className={cn('text-foreground-secondary', className)} title={title}>
        {label}
        {secondary && <span className="ml-1 text-foreground-tertiary">{secondary}</span>}
      </span>
    );
  }

  const linkBody = (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className="truncate font-medium">{label}</span>
      {secondary && <span className="shrink-0 text-foreground-tertiary">{secondary}</span>}
      {external && (
        <OpenInNewRoundedIcon sx={{ fontSize: 12 }} className="shrink-0 text-foreground-tertiary" />
      )}
    </span>
  );

  const baseClasses = cn(
    'inline-flex max-w-full items-center text-primary hover:text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm',
    className,
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        title={title}
      >
        {linkBody}
      </a>
    );
  }

  return (
    <Link href={href} className={baseClasses} title={title} prefetch={false}>
      {linkBody}
    </Link>
  );
}

EntityLink.displayName = 'EntityLink';
