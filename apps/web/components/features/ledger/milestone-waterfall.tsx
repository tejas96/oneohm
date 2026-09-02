'use client';

import { Tooltip } from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { type JSX, useState } from 'react';

import {
  EmptyPane,
  Mono,
  ROW_BLEED,
  TONE,
  TonePill,
  Track,
  type Tone,
} from '@/components/features/projects/components/project-detail/primitives';
import type { MilestoneBalance } from '@/lib/hooks/resources/ledger';
import { cn, formatDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

interface MilestoneWaterfallProps {
  milestones: MilestoneBalance[];
  onRecordPayment?: (milestoneId: string) => void;
  onWaive?: (milestone: MilestoneBalance) => void;
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  partial: { label: 'Part paid', tone: 'warning' },
  pending: { label: 'Pending', tone: 'neutral' },
  waived: { label: 'Waived', tone: 'neutral' },
};

/**
 * The milestone-first view: what each stage expects, what came in, what is short.
 *
 * Every figure comes from the API. Nothing is summed here — the old UI
 * recomputed money client-side in seven places, which is how the screen and the
 * database ended up disagreeing.
 */
export function MilestoneWaterfall({
  milestones,
  onRecordPayment,
  onWaive,
}: MilestoneWaterfallProps): JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (milestones.length === 0) {
    return (
      <EmptyPane
        title="No payment schedule"
        description="Milestones are created when a quote is converted into a project."
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {milestones.map((m) => {
        const status = STATUS[m.derivedStatus] ?? STATUS.pending;
        const pct =
          m.expectedPaise > 0
            ? Math.min(100, Math.round((m.allocatedPaise / m.expectedPaise) * 100))
            : 0;
        const isOpen = expanded === m.milestoneId;
        const isShort = m.balancePaise > 0 && m.derivedStatus !== 'waived';
        const barTone: Tone =
          m.derivedStatus === 'paid' ? 'success' : m.daysOverdue > 0 ? 'danger' : 'warning';

        return (
          <li key={m.milestoneId}>
            <div
              className={cn(
                'flex items-start gap-3 rounded-2xl py-3 transition-colors duration-fast hover:bg-background-tertiary',
                ROW_BLEED,
              )}
            >
              {/* The toggle wraps the CONTENT only. Wrapping the actions too put
                  interactive elements inside a button — invalid HTML, and why
                  the older version faked its buttons with role="button" spans. */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : m.milestoneId)}
                aria-expanded={isOpen}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                  {isOpen ? (
                    <ChevronDown className="size-3.5 text-foreground-tertiary" />
                  ) : (
                    <ChevronRight className="size-3.5 text-foreground-tertiary" />
                  )}
                  <Mono
                    className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: 'var(--ds-canvas-sunken)' }}
                  >
                    {m.displayOrder}
                  </Mono>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-[13px] font-semibold text-foreground',
                        m.derivedStatus === 'waived' && 'line-through',
                      )}
                    >
                      {m.name}
                    </span>
                    <TonePill
                      label={status?.label ?? 'Pending'}
                      tone={status?.tone ?? 'neutral'}
                      dot
                    />
                    {/* A lender-funded instalment is the bank's to pay. Saying so
                        stops anyone chasing the customer for it. */}
                    {m.payerType === 'lender' ? <TonePill label="Bank pays" tone="info" /> : null}
                    {m.daysOverdue > 0 ? (
                      <TonePill label={`${m.daysOverdue} d overdue`} tone="danger" />
                    ) : null}
                  </span>

                  <span className="mt-2 block">
                    <Track pct={pct} tone={barTone} height={6} />
                  </span>

                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-foreground-secondary">
                    <span>
                      Expected{' '}
                      <Mono className="text-foreground">{formatPaise(m.expectedPaise)}</Mono>
                    </span>
                    <span>
                      Received{' '}
                      <Mono className="text-foreground">{formatPaise(m.allocatedPaise)}</Mono>
                    </span>
                    {isShort ? (
                      <span className="font-medium" style={{ color: TONE.danger.ink }}>
                        Short by <Mono>{formatPaise(m.balancePaise)}</Mono>
                      </span>
                    ) : null}
                    {m.overAllocatedPaise > 0 ? (
                      <span className="font-medium" style={{ color: TONE.info.ink }}>
                        Overpaid by <Mono>{formatPaise(m.overAllocatedPaise)}</Mono>
                      </span>
                    ) : null}
                    {m.dueDate ? (
                      <span>
                        Due <Mono>{formatDate(m.dueDate)}</Mono>
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>

              <span className="flex shrink-0 gap-1.5">
                {isShort && onRecordPayment ? (
                  <button
                    type="button"
                    onClick={() => onRecordPayment(m.milestoneId)}
                    className="inline-flex h-7 items-center rounded-pill bg-accent-subtle px-3 text-[12px] font-medium text-primary-dark transition-[filter] duration-fast hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Record
                  </button>
                ) : null}
                {/* Waiving writes off a residual nobody intends to collect. Only
                    offered where money is genuinely still owed — a paid or
                    already-waived milestone has nothing to write off. */}
                {isShort && onWaive ? (
                  <button
                    type="button"
                    onClick={() => onWaive(m)}
                    className="inline-flex h-7 items-center rounded-pill px-3 text-[12px] font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-tertiary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Waive
                  </button>
                ) : null}
              </span>
            </div>

            {isOpen ? (
              <div
                className={cn('mb-2 rounded-2xl px-3.5 py-3', ROW_BLEED)}
                style={{ background: 'var(--ds-canvas-sunken)' }}
              >
                {m.allocations.length === 0 ? (
                  <p className="text-[12.5px] text-foreground-tertiary">
                    Nothing received against this yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {m.allocations.map((a) => {
                      const isReversal = Boolean(a.reversesId);
                      const wasReversed = Boolean(a.reversedByEntryNo);
                      // A reversed line is history, not live money — dim it
                      // rather than hide it, so the audit trail stays whole.
                      const dim = isReversal || wasReversed;
                      return (
                        <li
                          key={a.allocationId}
                          className={cn(
                            'flex items-start justify-between gap-3 text-[12.5px]',
                            dim ? 'text-foreground-tertiary' : 'text-foreground',
                          )}
                        >
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <Mono className="text-[11px] text-foreground-secondary">
                              {a.entryNo}
                            </Mono>
                            <span className="text-foreground-secondary">
                              <Mono>{formatDate(a.valueDate)}</Mono>
                              {a.valueDateIsInferred ? (
                                /* Historical rows have no recoverable value date —
                                   say so rather than implying the date is a fact. */
                                <Tooltip title="Date inferred from when the record was created">
                                  <span className="ml-1 text-[11px]">(approx)</span>
                                </Tooltip>
                              ) : null}
                            </span>
                            {a.paymentMethod ? (
                              <span className="text-[11px] uppercase tracking-[0.06em] text-foreground-tertiary">
                                {a.paymentMethod}
                              </span>
                            ) : null}
                            {/* Both halves of a reversal stay on screen. Hiding the
                                correction while leaving the original showed money
                                that never cleared as live cash. */}
                            {isReversal ? (
                              <Tooltip title={a.reversalReason ?? 'No reason given'}>
                                <span>
                                  <TonePill
                                    label={`reverses ${a.reversesEntryNo}`}
                                    tone="warning"
                                    className="h-[18px] px-1.5 text-[10px]"
                                  />
                                </span>
                              </Tooltip>
                            ) : null}
                            {wasReversed ? (
                              <TonePill
                                label={`reversed by ${a.reversedByEntryNo}`}
                                tone="neutral"
                                className="h-[18px] px-1.5 text-[10px]"
                              />
                            ) : null}
                          </span>
                          <span className="flex shrink-0 flex-col items-end">
                            {/* The allocation, never the entry total. */}
                            <Mono className="font-medium">{formatPaise(a.allocatedPaise)}</Mono>
                            {a.allocatedPaise !== a.entryAmountPaise ? (
                              <Mono className="text-[10.5px] text-foreground-tertiary">
                                of {formatPaise(a.entryAmountPaise)}
                              </Mono>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
