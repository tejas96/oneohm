'use client';

import { Avatar, Box, Button, ButtonBase, Card, LinearProgress, Tooltip } from '@mui/material';
import { type JSX, useState } from 'react';

import { MUIStatusChip, MUITypography, type StatusChipColor } from '@/components/ui';
import type { MilestoneBalance } from '@/lib/hooks/resources/ledger';
import { formatPaise } from '@/lib/utils/paise';

interface MilestoneWaterfallProps {
  milestones: MilestoneBalance[];
  onRecordPayment?: (milestoneId: string) => void;
  onWaive?: (milestone: MilestoneBalance) => void;
}

/** Palette comes from MUI tokens, never hand-written colour classes. */
const STATUS_CHIP: Record<string, { label: string; color: StatusChipColor }> = {
  paid: { label: 'Paid', color: 'success' },
  partial: { label: 'Partial', color: 'warning' },
  pending: { label: 'Pending', color: 'default' },
  waived: { label: 'Waived', color: 'default' },
};

/** Shared by every amount so the columns line up down the list. */
const NUMERIC = { fontVariantNumeric: 'tabular-nums' } as const;

/**
 * The milestone-first view: what each stage expects, what came in, what is short.
 *
 * This is the client's requirement rendered literally — "milestone 1 expects
 * ₹10,000, customer paid ₹2,000, flag that he is ₹8,000 short".
 *
 * Every figure comes from the API. Nothing is summed here: the old UI recomputed
 * money client-side in seven places, which is how the screen and the database
 * ended up disagreeing.
 */
export function MilestoneWaterfall({
  milestones,
  onRecordPayment,
  onWaive,
}: MilestoneWaterfallProps): JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (milestones.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
        <MUITypography variant="placeholder">
          No payment schedule yet. Milestones are created when a quote is converted to a project.
        </MUITypography>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {milestones.map((m) => {
        const status = STATUS_CHIP[m.derivedStatus] ?? STATUS_CHIP.pending;
        const pct =
          m.expectedPaise > 0
            ? Math.min(100, Math.round((m.allocatedPaise / m.expectedPaise) * 100))
            : 0;
        const isOpen = expanded === m.milestoneId;
        const isShort = m.balancePaise > 0 && m.derivedStatus !== 'waived';

        return (
          <Card key={m.milestoneId} variant="outlined" component="li">
            {/* The toggle wraps the CONTENT only. Wrapping the actions too made
                them interactive elements nested inside a <button> — invalid
                HTML, and the reason the previous version faked its buttons with
                role="button" spans. */}
            <div className="flex items-start gap-4 p-4">
              <ButtonBase
                onClick={() => setExpanded(isOpen ? null : m.milestoneId)}
                aria-expanded={isOpen}
                aria-label={`${m.name} — ${status?.label ?? 'Pending'}`}
                sx={{ alignItems: 'flex-start', textAlign: 'left', borderRadius: 1, gap: 2 }}
                className="min-w-0 flex-1"
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: 12,
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    ...NUMERIC,
                  }}
                >
                  {m.displayOrder}
                </Avatar>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <MUITypography variant="bodyPrimary" fontWeight={500} component="span">
                      {m.name}
                    </MUITypography>
                    <MUIStatusChip
                      label={status?.label ?? 'Pending'}
                      color={status?.color ?? 'default'}
                      size="small"
                      autoColor={false}
                      sx={
                        m.derivedStatus === 'waived'
                          ? { textDecoration: 'line-through' }
                          : undefined
                      }
                    />
                    {/* A lender-funded instalment is the bank's to pay. Saying so
                        stops anyone chasing the customer for it. */}
                    {m.payerType === 'lender' && (
                      <MUIStatusChip
                        label="Bank pays"
                        color="info"
                        size="small"
                        autoColor={false}
                      />
                    )}
                    {m.daysOverdue > 0 && (
                      <MUIStatusChip
                        label={`${m.daysOverdue}d overdue`}
                        color="error"
                        size="small"
                        autoColor={false}
                      />
                    )}
                  </span>

                  <span className="mt-2 block">
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 6, borderRadius: 3 }}
                      color={
                        m.derivedStatus === 'paid'
                          ? 'success'
                          : m.daysOverdue > 0
                            ? 'error'
                            : 'warning'
                      }
                    />
                  </span>

                  <Box
                    component="span"
                    sx={{ fontSize: 14 }}
                    className="mt-2 flex flex-wrap gap-x-4 gap-y-1"
                  >
                    <Box component="span" color="text.secondary">
                      Expected{' '}
                      <Box component="span" sx={{ ...NUMERIC, color: 'text.primary' }}>
                        {formatPaise(m.expectedPaise)}
                      </Box>
                    </Box>
                    <Box component="span" color="text.secondary">
                      Received{' '}
                      <Box component="span" sx={{ ...NUMERIC, color: 'text.primary' }}>
                        {formatPaise(m.allocatedPaise)}
                      </Box>
                    </Box>
                    {isShort && (
                      <Box component="span" sx={{ fontWeight: 500, color: 'error.main' }}>
                        Short by{' '}
                        <Box component="span" sx={NUMERIC}>
                          {formatPaise(m.balancePaise)}
                        </Box>
                      </Box>
                    )}
                    {m.overAllocatedPaise > 0 && (
                      <Box component="span" sx={{ fontWeight: 500, color: 'info.main' }}>
                        Overpaid by{' '}
                        <Box component="span" sx={NUMERIC}>
                          {formatPaise(m.overAllocatedPaise)}
                        </Box>
                      </Box>
                    )}
                    {m.dueDate && (
                      <Box component="span" color="text.secondary">
                        Due {m.dueDate}
                      </Box>
                    )}
                  </Box>
                </span>
              </ButtonBase>

              <span className="flex shrink-0 gap-1.5">
                {isShort && onRecordPayment && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onRecordPayment(m.milestoneId)}
                  >
                    Record payment
                  </Button>
                )}
                {/* Waiving writes off a residual nobody intends to collect. Only
                    offered where money is genuinely still owed — a paid or
                    already-waived milestone has nothing to write off. */}
                {isShort && onWaive && (
                  <Button size="small" variant="text" color="inherit" onClick={() => onWaive(m)}>
                    Waive
                  </Button>
                )}
              </span>
            </div>

            {isOpen && (
              <Box sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 1.5 }}>
                {m.allocations.length === 0 ? (
                  <MUITypography variant="placeholder">
                    Nothing received against this yet.
                  </MUITypography>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {m.allocations.map((a) => {
                      const isReversal = Boolean(a.reversesId);
                      const wasReversed = Boolean(a.reversedByEntryNo);
                      return (
                        <Box
                          component="li"
                          key={a.allocationId}
                          sx={{
                            fontSize: 14,
                            // A reversed line is history, not live money — dim it
                            // rather than hide it, so the audit trail stays whole.
                            color: isReversal || wasReversed ? 'text.secondary' : 'text.primary',
                          }}
                          className="flex items-start justify-between gap-3"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <Box
                              component="span"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                color: 'text.secondary',
                              }}
                            >
                              {a.entryNo}
                            </Box>
                            <Box component="span" color="text.secondary">
                              {a.valueDate}
                            </Box>
                            {a.valueDateIsInferred && (
                              /* Historical rows have no recoverable value date —
                                 say so rather than implying the date is a fact. */
                              <Tooltip title="Date inferred from the record's creation time">
                                <Box
                                  component="span"
                                  sx={{ fontSize: 12, color: 'text.secondary' }}
                                >
                                  (approx)
                                </Box>
                              </Tooltip>
                            )}
                            {a.paymentMethod && (
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 12,
                                  textTransform: 'uppercase',
                                  color: 'text.secondary',
                                }}
                              >
                                {a.paymentMethod}
                              </Box>
                            )}
                            {/* Both halves of a reversal stay on screen. Hiding the
                                correction while leaving the original showed money
                                that never cleared as live cash. */}
                            {isReversal && (
                              <Tooltip title={a.reversalReason ?? ''}>
                                <span>
                                  <MUIStatusChip
                                    label={`reverses ${a.reversesEntryNo}`}
                                    color="warning"
                                    size="small"
                                    autoColor={false}
                                  />
                                </span>
                              </Tooltip>
                            )}
                            {wasReversed && (
                              <MUIStatusChip
                                label={`reversed by ${a.reversedByEntryNo}`}
                                color="default"
                                size="small"
                                autoColor={false}
                              />
                            )}
                          </span>
                          <span className="flex shrink-0 flex-col items-end">
                            {/* The allocation, never the entry total. */}
                            <Box component="span" sx={NUMERIC}>
                              {formatPaise(a.allocatedPaise)}
                            </Box>
                            {a.allocatedPaise !== a.entryAmountPaise && (
                              <Box component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>
                                of {formatPaise(a.entryAmountPaise)}
                              </Box>
                            )}
                          </span>
                        </Box>
                      );
                    })}
                  </ul>
                )}
              </Box>
            )}
          </Card>
        );
      })}
    </ul>
  );
}
