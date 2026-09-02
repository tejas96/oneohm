'use client';

import { Lock } from 'lucide-react';
import * as React from 'react';

import {
  marginPaise,
  openMilestonesByUrgency,
  overdueMilestones,
  plural,
  waivedRemainderPaise,
} from '../../lib/derive';
import { CardLink, DetailCard, EmptyPane, Mono, TONE, TonePill } from '../../primitives';
import type { ProjectDetailData } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';
import type { MilestoneBalance } from '@/lib/hooks/resources/ledger';
import { cn, formatDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

const MAX_SCHEDULE_ROWS = 3;

interface MoneyCardProps {
  ledger: ProjectDetailData['ledger'];
  projectPath: string;
  className?: string;
}

function dueLabel(m: MilestoneBalance): { text: string; bad: boolean } {
  if (m.daysOverdue > 0) return { text: `${m.daysOverdue} d overdue`, bad: true };
  if (m.dueDate) return { text: `Due ${formatDate(m.dueDate)}`, bad: false };
  return { text: 'No due date', bad: false };
}

/**
 * How the contract splits, and what falls due next.
 *
 * Deliberately does NOT repeat the Outstanding figure — the header band states
 * it, and it is on screen directly above this card. What has no other home on
 * the Overview is the *shape* of the contract, the margin left in it, and the
 * next few milestones. Every figure comes from the ledger, in paise.
 */
export function MoneyCard({ ledger, projectPath, className }: MoneyCardProps): React.JSX.Element {
  const financeHref = `${projectPath}?tab=finance`;

  if (!ledger.allowed) {
    return (
      <DetailCard label="Money" className={className}>
        <EmptyPane
          icon={<Lock className="size-4" strokeWidth={2} />}
          tone="warning"
          title="Finance access needed"
          description="This project's contract, receipts and spend are visible with the finance permission."
        />
      </DetailCard>
    );
  }

  const s = ledger.data;
  const overdue = s ? overdueMilestones(s) : [];
  const owedLate = overdue.reduce((sum, m) => sum + m.balancePaise, 0);
  const schedule = s ? openMilestonesByUrgency(s).slice(0, MAX_SCHEDULE_ROWS) : [];
  const margin = s ? marginPaise(s) : null;
  const usedPct = s && s.contractPaise > 0 ? Math.round((s.spentPaise / s.contractPaise) * 100) : 0;

  /*
   * The bar splits the contract three ways: collected, still owed, written off.
   * `waivedRemainderPaise` rather than the API's `waivedPaise` — see the note on
   * that helper. With it the three shares add up to the contract exactly, so the
   * bar has no unexplained grey tail.
   */
  const waived = s ? waivedRemainderPaise(s) : 0;
  const share = (paise: number): number =>
    s && s.contractPaise > 0 ? Math.max(0, (paise / s.contractPaise) * 100) : 0;
  const receivedShare = Math.min(100, share(s?.receivedPaise ?? 0));
  const outstandingShare = Math.min(100 - receivedShare, share(s?.outstandingPaise ?? 0));
  const waivedShare = Math.min(100 - receivedShare - outstandingShare, share(waived));

  return (
    <DetailCard
      label="Money"
      action={<CardLink href={financeHref}>Open money</CardLink>}
      isError={ledger.isError}
      onRetry={ledger.refetch}
      className={className}
    >
      {ledger.isLoading || !s ? (
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-full rounded-pill" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-10 rounded-md" />
            ))}
          </div>
        </div>
      ) : s.contractPaise <= 0 ? (
        <EmptyPane
          title="No contract value yet"
          description="It is set when the quote is accepted and the payment schedule is created."
        />
      ) : (
        <>
          {/* ── How the contract splits ── */}
          <div
            className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-pill"
            style={{ background: 'var(--ds-canvas-sunken)' }}
            role="img"
            aria-label={`${Math.round(receivedShare)} percent of the contract received, ${Math.round(outstandingShare)} percent outstanding${waived > 0 ? `, ${Math.round(waivedShare)} percent written off` : ''}.`}
          >
            <span style={{ width: `${receivedShare}%`, background: TONE.success.ink }} />
            <span style={{ width: `${outstandingShare}%`, background: TONE.warning.ink }} />
            <span style={{ width: `${waivedShare}%`, background: 'var(--ds-neutral-300)' }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-foreground-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-[2px]"
                style={{ background: TONE.success.ink }}
              />
              Received <Mono className="text-foreground">{formatPaise(s.receivedPaise)}</Mono>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-[2px]"
                style={{ background: TONE.warning.ink }}
              />
              Outstanding <Mono className="text-foreground">{formatPaise(s.outstandingPaise)}</Mono>
            </span>
            {waived > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-foreground-tertiary">
                <span
                  aria-hidden
                  className="size-2 rounded-[2px]"
                  style={{ background: 'var(--ds-neutral-300)' }}
                />
                Written off <Mono>{formatPaise(waived)}</Mono>
              </span>
            ) : null}
            {owedLate > 0 ? (
              <TonePill
                label={`${formatPaise(owedLate)} overdue · ${overdue.length} ${plural(overdue.length, 'milestone')}`}
                tone="danger"
                dot
                className="ml-auto"
              />
            ) : s.outstandingPaise <= 0 ? (
              <TonePill label="Fully collected" tone="success" dot className="ml-auto" />
            ) : null}
          </div>

          {/* ── The two figures the header band does not carry ── */}
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-tertiary">
                Contract
              </dt>
              <dd className="mt-1 truncate text-[15px] font-semibold tabular-nums text-foreground">
                {formatPaise(s.contractPaise)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-tertiary">
                {margin != null && margin < 0 ? 'Loss' : 'Margin left'}
              </dt>
              <dd
                className="mt-1 truncate text-[15px] font-semibold tabular-nums"
                style={{
                  color: margin != null && margin < 0 ? TONE.danger.ink : 'var(--ds-text-primary)',
                }}
              >
                {margin == null ? '—' : formatPaise(Math.abs(margin))}
              </dd>
              {margin == null ? (
                <dd className="mt-0.5 text-[11px] text-foreground-tertiary">No costs recorded</dd>
              ) : null}
            </div>
          </dl>

          {s.spentPaise > 0 && usedPct >= 80 ? (
            <p
              className="mt-3 rounded-2xl px-3 py-2 text-[12px]"
              style={{
                background: usedPct >= 100 ? TONE.danger.tint : TONE.warning.tint,
                color: usedPct >= 100 ? TONE.danger.ink : TONE.warning.ink,
              }}
            >
              Costs are at {usedPct}% of the contract.
            </p>
          ) : null}

          {/* ── What falls due next ── */}
          {schedule.length > 0 ? (
            <>
              <p className="mt-4 pb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
                Falls due next
              </p>
              <ol className="flex flex-col gap-1.5">
                {schedule.map((m) => {
                  const due = dueLabel(m);
                  return (
                    <li key={m.milestoneId} className="flex min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-foreground">
                          {m.name}
                          {m.payerType === 'lender' ? (
                            <span className="ml-1.5 text-[10.5px] font-normal text-foreground-tertiary">
                              bank pays
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            'block text-[11px]',
                            due.bad ? 'font-medium text-error' : 'text-foreground-tertiary',
                          )}
                        >
                          {due.text}
                          {m.derivedStatus === 'partial' ? ' · part paid' : ''}
                        </span>
                      </span>
                      <Mono className="shrink-0 text-[12.5px] text-foreground">
                        {formatPaise(m.balancePaise)}
                      </Mono>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <p className="mt-4 text-[12px] text-foreground-tertiary">Every milestone is settled.</p>
          )}
        </>
      )}
    </DetailCard>
  );
}
