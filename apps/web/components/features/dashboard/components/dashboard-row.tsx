'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { resolveAction } from '../lib/action-routes';

import { followupRecordHref } from '@/components/features/followups';
import { ALWAYS_OPEN, useGatedAction, type Gate } from '@/lib/rbac';
import { cn } from '@/lib/utils';

// `text-danger` does not resolve — this token bridge has no top-level `danger`
// colour, only `error` (`--ds-danger` under a different name). `text-error`
// is the exact same value.
export const SEVERITY_TEXT: Record<DashboardItem['severity'], string> = {
  critical: 'text-error',
  warning: 'text-warning',
  info: 'text-foreground-secondary',
};

interface DashboardRowProps {
  item: DashboardItem;
  onCompleteFollowup: (item: DashboardItem) => void;
  /**
   * True while ANOTHER employee's dashboard is on screen.
   *
   * Hides the follow-up complete control — the only action here that writes.
   * Completing their follow-up would record YOU as the completer on a queue you
   * are only inspecting. Deep links are untouched: they navigate rather than
   * write, and they carry their own permission gate. Decision 4.
   */
  readOnly?: boolean;
}

/**
 * One row, used unchanged by every block AND by the drawer.
 *
 * There is no coloured edge bar and no row tint. An earlier draft had both; the
 * approved design carries urgency in the section label and the reason line only,
 * because colour on every row is colour nowhere.
 */
export function DashboardRow({
  item,
  onCompleteFollowup,
  readOnly = false,
}: DashboardRowProps): React.JSX.Element {
  const target = resolveAction(item);
  const gate = (item.gate ?? ALWAYS_OPEN) as Gate;

  const performAction = React.useCallback(() => {
    if (target.mode === 'dialog') {
      onCompleteFollowup(item);
    }
  }, [target, item, onCompleteFollowup]);

  const { allowed, onGatedClick } = useGatedAction(gate, performAction, target.label);

  const followupLeadHref =
    item.action === 'complete_followup' && item.params.id
      ? followupRecordHref(
          {
            customerId: item.params.customerId,
            propertyId: item.params.propertyId ?? null,
          },
          { followupId: item.params.id },
        )
      : null;

  const body = (
    <>
      {followupLeadHref ? (
        <Link
          href={followupLeadHref}
          className="truncate text-sm font-medium text-foreground hover:text-primary-dark"
        >
          {item.title}
        </Link>
      ) : (
        <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
      )}
      {item.subtitle ? (
        <span className="mt-0.5 truncate text-xs text-foreground-tertiary">{item.subtitle}</span>
      ) : null}
    </>
  );

  const actionClass = cn(
    'inline-flex h-7 shrink-0 items-center gap-1.5 justify-self-end rounded-pill px-3 text-xs font-medium [grid-area:action]',
  );

  return (
    // The four-column row is for the wide main column. Money to chase lives in
    // a 304px rail, where `auto` amount + action leave ~10px each for title and
    // reason — names wrap to "S.." / "W.." and "Due in 0 days" stacks vertically.
    // The row is its own container so the same layout kicks in on a narrow
    // viewport, not only in that rail.
    <div className="@container">
      <div
        className={cn(
          'group grid items-center gap-x-3 gap-y-1 rounded-lg px-3 py-3 transition-colors hover:bg-background-tertiary',
          "grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:'title_meta'_'reason_action']",
          "@[28rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] @[28rem]:gap-3 @[28rem]:[grid-template-areas:'title_reason_meta_action']",
        )}
      >
        <div className="flex min-w-0 flex-col [grid-area:title]">{body}</div>

        <p
          className={cn(
            'min-w-0 truncate text-xs leading-snug [grid-area:reason]',
            SEVERITY_TEXT[item.severity],
          )}
        >
          {item.reason}
        </p>

        <div className="text-right tabular-nums [grid-area:meta]">
          {item.meta ? <div className="text-xs text-foreground-secondary">{item.meta}</div> : null}
          {item.metaSecondary && item.kind.startsWith('service') ? (
            <div className="mt-0.5 text-2xs uppercase tracking-wide text-foreground-tertiary">
              {item.metaSecondary}
            </div>
          ) : null}
        </div>

        {/* A blocked action stays VISIBLE and clickable — it opens the dialog that
            names the permission. `disabled` would swallow that click. */}
        {readOnly && target.mode === 'dialog' ? null : target.mode === 'navigate' && allowed ? (
          <Link
            href={target.href}
            className={cn(
              actionClass,
              'text-foreground-secondary transition-colors group-hover:bg-accent-subtle group-hover:text-primary-dark',
            )}
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
              actionClass,
              'transition-colors',
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
    </div>
  );
}
