'use client';

import { formatFollowupWhen } from '@tejas96/shared/utils';
import Link from 'next/link';
import type { JSX, MouseEvent } from 'react';

import { followupText } from './format';
import { customerLinks } from './links';
import type { Customer } from '../../hooks/use-customers';

import { CalendarIcon } from '@/components/shared/calm-list';
import { cn } from '@/lib/utils';

const RING_TONE = {
  due: 'animate-calm-pulse bg-[var(--ds-danger-bg)] text-error motion-reduce:animate-none',
  ok: 'bg-accent-subtle text-primary-dark',
  none: 'bg-background-tertiary text-foreground-secondary',
} as const;

const stopRowClick = (event: MouseEvent): void => event.stopPropagation();

/**
 * The next follow-up, or why there is none. The whole cell opens the customer's
 * follow-ups tab — on that follow-up when there is one.
 */
export function FollowUpCell({
  customer,
  className,
}: {
  customer: Customer;
  className?: string;
}): JSX.Element {
  const next = customer.nextFollowup ?? null;
  const text = followupText(customer);

  const hint = next
    ? [
        next.subject,
        formatFollowupWhen(next.scheduledAt),
        next.assigneeName ? `assigned to ${next.assigneeName}` : 'no one assigned',
      ]
        .filter(Boolean)
        .join(' · ')
    : [text.title, text.sub].filter(Boolean).join(' · ');

  return (
    <Link
      href={customerLinks.followups(customer.id, next?.id)}
      prefetch={false}
      onClick={stopRowClick}
      title={hint}
      aria-label={`Follow-ups: ${[text.title, text.sub].filter(Boolean).join(', ')}`}
      className={cn('group/next flex min-w-0 items-center gap-2.5 rounded-rf-lg', className)}
    >
      <span
        className={cn(
          'grid size-[34px] flex-none place-items-center rounded-full',
          RING_TONE[text.tone],
        )}
      >
        <CalendarIcon />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-[14px] group-hover/next:underline',
            text.tone === 'due' && 'font-medium text-error',
            text.tone === 'ok' && 'font-medium text-foreground',
            text.tone === 'none' && 'font-normal text-foreground-tertiary',
          )}
        >
          {text.title}
        </span>
        {text.sub ? (
          <span className="block truncate text-[12px] text-foreground-tertiary">{text.sub}</span>
        ) : null}
      </span>
    </Link>
  );
}
