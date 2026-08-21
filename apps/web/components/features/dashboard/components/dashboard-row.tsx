'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { resolveAction } from '../lib/action-routes';

import { ALWAYS_OPEN, useGatedAction, type Gate } from '@/lib/rbac';
import { cn } from '@/lib/utils';

// `text-danger` does not resolve — this token bridge has no top-level `danger`
// colour, only `error` (`--ds-danger` under a different name). `text-error`
// is the exact same value.
const SEVERITY_TEXT: Record<DashboardItem['severity'], string> = {
  critical: 'text-error',
  warning: 'text-warning',
  info: 'text-foreground-secondary',
};

interface DashboardRowProps {
  item: DashboardItem;
  onCompleteFollowup: (item: DashboardItem) => void;
}

/**
 * One row, used unchanged by every block AND by the drawer.
 *
 * There is no coloured edge bar and no row tint. An earlier draft had both; the
 * approved design carries urgency in the section label and the reason line only,
 * because colour on every row is colour nowhere.
 */
export function DashboardRow({ item, onCompleteFollowup }: DashboardRowProps): React.JSX.Element {
  const target = resolveAction(item);
  const gate = (item.gate ?? ALWAYS_OPEN) as Gate;

  const performAction = React.useCallback(() => {
    if (target.mode === 'dialog') {
      onCompleteFollowup(item);
    }
  }, [target, item, onCompleteFollowup]);

  const { allowed, onGatedClick } = useGatedAction(gate, performAction, target.label);

  const body = (
    <>
      <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
      {item.subtitle ? (
        <span className="mt-0.5 truncate text-xs text-foreground-tertiary">{item.subtitle}</span>
      ) : null}
    </>
  );

  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-background-tertiary">
      <div className="flex min-w-0 flex-col">{body}</div>

      <p className={cn('min-w-0 text-xs leading-snug', SEVERITY_TEXT[item.severity])}>
        {item.reason}
      </p>

      <div className="text-right tabular-nums">
        {item.meta ? (
          <div className="text-xs text-foreground-secondary">{item.meta}</div>
        ) : null}
        {item.metaSecondary && item.kind.startsWith('service') ? (
          <div className="mt-0.5 text-2xs uppercase tracking-wide text-foreground-tertiary">
            {item.metaSecondary}
          </div>
        ) : null}
      </div>

      {/* A blocked action stays VISIBLE and clickable — it opens the dialog that
          names the permission. `disabled` would swallow that click. */}
      {target.mode === 'navigate' && allowed ? (
        <Link
          href={target.href}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs font-medium text-foreground-secondary transition-colors group-hover:bg-accent-subtle group-hover:text-primary-dark"
        >
          {target.label}
          <ArrowRight className="size-3" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onGatedClick}
          aria-disabled={!allowed}
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs font-medium transition-colors',
            allowed
              ? 'text-foreground-secondary group-hover:bg-accent-subtle group-hover:text-primary-dark'
              : 'cursor-not-allowed bg-background-tertiary text-foreground-secondary',
          )}
        >
          {!allowed ? <Lock className="size-3" /> : null}
          {target.label}
          {allowed ? <ArrowRight className="size-3" /> : null}
        </button>
      )}
    </div>
  );
}
