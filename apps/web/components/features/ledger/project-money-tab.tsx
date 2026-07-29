'use client';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { type JSX, useState } from 'react';

import { ChangeOrderDialog, ReverseEntryDialog, WaiveMilestoneDialog } from './correction-dialogs';
import { useReceiptPdf } from './hooks/use-receipt-pdf';
import { MilestoneWaterfall } from './milestone-waterfall';
import { RecordMoneyDialog } from './record-money-dialog';

import type { ProjectDetail } from '@/components/features/projects/hooks/types';
import { MUITypography } from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import {
  useProjectEntries,
  useProjectLedger,
  type LedgerEntry,
  type MilestoneBalance,
  type ProjectLedgerSummary,
} from '@/lib/hooks/resources/ledger';
import { formatPaise } from '@/lib/utils/paise';

interface ProjectMoneyTabProps {
  projectId: string;
  /** Supplies the receipt header (customer, site, project). Already fetched by the parent. */
  project?: ProjectDetail;
  isActive?: boolean;
}

/**
 * The project's money, on one screen.
 *
 * Replaces the previous Finance tab, which split payment terms, receipts and
 * expenses across three equal sub-tabs — burying the question anyone actually
 * opens the page to answer: *is this customer behind?* Milestones lead; the
 * ledger sits underneath.
 *
 * Two queries, not the nine the old tab fired.
 */
export function ProjectMoneyTab({
  projectId,
  project,
  isActive = true,
}: ProjectMoneyTabProps): JSX.Element {
  const summary = useProjectLedger(projectId, { enabled: isActive });
  const entries = useProjectEntries(projectId, { enabled: isActive });
  const [dialog, setDialog] = useState<'receipt' | 'expense' | 'changeOrder' | null>(null);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);
  const [waiving, setWaiving] = useState<MilestoneBalance | null>(null);
  const receiptPdf = useReceiptPdf();

  /**
   * Re-file (or re-download) the receipt for an entry recorded earlier.
   *
   * This is the retry path when automatic filing failed, and the only way to
   * produce receipts for payments recorded before this existed. Reads the
   * CURRENT summary, so the balance shown is the balance now — a receipt
   * reprinted later is honest about that rather than reconstructing history.
   */
  const regenerateReceipt = async (entry: LedgerEntry): Promise<void> => {
    if (!project || !summary.data) return;
    const filed = await receiptPdf.generateAndFile(entry, summary.data, project);
    if (filed) showToast.success(`Receipt for ${entry.entryNo} filed in customer documents`);
  };

  if (summary.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="rounded" height={88} />
        <Skeleton variant="rounded" height={220} />
      </div>
    );
  }

  if (summary.isError || !summary.data) {
    return <Alert severity="error">Could not load this project&apos;s finances.</Alert>;
  }

  const s = summary.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="contained" size="small" onClick={() => setDialog('receipt')}>
          Record payment
        </Button>
        <Button variant="outlined" size="small" onClick={() => setDialog('expense')}>
          Record expense
        </Button>
        <Button variant="outlined" size="small" onClick={() => setDialog('changeOrder')}>
          Add change order
        </Button>
      </div>

      <SummaryStrip summary={s} />

      <CostOverrunBanner contractPaise={s.contractPaise} spentPaise={s.spentPaise} />

      {/* Unallocated cash is money received that belongs to no milestone —
          an overpayment, or an advance taken before the schedule existed. The
          old model had nowhere to put it, so it was simply invisible. */}
      {s.unallocatedPaise > 0 && (
        // Alert carries the icon, palette and ARIA role — the hand-rolled div it
        // replaces used an emoji as its icon and Tailwind colour utilities for
        // severity, neither of which the design system permits.
        <Alert severity={s.outstandingPaise > 0 ? 'warning' : 'info'} variant="outlined">
          <AlertTitle>
            {formatPaise(s.unallocatedPaise)} received but not applied to any milestone
          </AlertTitle>
          {/* Two genuinely different situations. Credit alongside an
              outstanding balance is an anomaly worth naming — the previous
              copy promised the credit would apply itself to the next
              milestone, which it never did, so an overpaid customer sat on
              the chase list. Change orders now sweep credit on creation, so
              this branch should be unreachable; leaving it in makes the page
              its own regression detector. */}
          {s.outstandingPaise > 0
            ? `${formatPaise(s.outstandingPaise)} still shows as outstanding below and this credit has not been applied to it. Record it against the milestone, or refund the customer.`
            : 'Everything owed on this project is covered. This sits as credit on the customer’s account: it is applied automatically to the next change order raised here, and can be refunded until then.'}
        </Alert>
      )}

      <section>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Payment schedule
        </MUITypography>
        <MilestoneWaterfall
          milestones={s.milestones}
          onRecordPayment={() => setDialog('receipt')}
          onWaive={setWaiving}
        />
      </section>

      <ProjectEntries
        entries={entries.data ?? []}
        isLoading={entries.isLoading}
        onReverse={setReversing}
        onRegenerateReceipt={project ? regenerateReceipt : undefined}
      />

      {(dialog === 'receipt' || dialog === 'expense') && (
        <RecordMoneyDialog
          open
          mode={dialog}
          projectId={projectId}
          milestones={s.milestones}
          onClose={() => setDialog(null)}
          // Fired after the payment has committed. The dialog has already
          // closed and the money is already recorded — this only decides
          // whether a receipt ends up in the customer's documents.
          onReceiptRecorded={
            project
              ? async (entry) => {
                  // Refetch first: the allocation split and the post-payment
                  // balance are both server-decided, and the summary in hand is
                  // the pre-payment one.
                  const fresh = await summary.refetch();
                  if (fresh.data) {
                    await receiptPdf.generateAndFile(entry, fresh.data, project);
                  }
                }
              : undefined
          }
        />
      )}

      {dialog === 'changeOrder' && (
        <ChangeOrderDialog
          open
          projectId={projectId}
          currentContractPaise={s.contractPaise}
          onClose={() => setDialog(null)}
        />
      )}

      {reversing && (
        <ReverseEntryDialog
          open
          projectId={projectId}
          entry={reversing}
          onClose={() => setReversing(null)}
        />
      )}

      {waiving && (
        <WaiveMilestoneDialog
          open
          projectId={projectId}
          milestone={waiving}
          onClose={() => setWaiving(null)}
        />
      )}
    </div>
  );
}

/**
 * Warn when project cost approaches or exceeds the quoted price.
 *
 * Expenses never change what the customer owes — that stays the contract. But a
 * project whose costs have overrun the quote is losing money, and nothing in the
 * old module ever said so: quoted margin was assumed, never checked against
 * reality. This is the difference between planned and actual margin, stated
 * plainly on the page where someone will see it.
 */
function CostOverrunBanner({
  contractPaise,
  spentPaise,
}: {
  contractPaise: number;
  spentPaise: number;
}): JSX.Element | null {
  if (contractPaise <= 0 || spentPaise <= 0) return null;

  const marginPaise = contractPaise - spentPaise;
  const usedPct = Math.round((spentPaise / contractPaise) * 100);

  // Below 80% of the contract there is nothing worth interrupting anyone about.
  if (usedPct < 80) return null;

  const overrun = marginPaise < 0;

  return (
    <Alert severity={overrun ? 'error' : 'warning'} variant="outlined">
      <AlertTitle>
        {/* "Contract", not "quote". The figure compared against is
            contractPaise — quote plus change orders — which is the right
            basis, since it is the revenue this project will actually collect.
            Calling it the quoted price was simply wrong: on a project with
            change orders it printed the contract under the word "Quoted",
            which is a different and smaller number. */}
        {overrun
          ? `Costs have exceeded the contract value by ${formatPaise(Math.abs(marginPaise))}`
          : `Costs are at ${usedPct}% of the contract value`}
      </AlertTitle>
      <MUITypography variant="body">
        Contract {formatPaise(contractPaise)} · spent {formatPaise(spentPaise)} ·{' '}
        <Box component="span" fontWeight={600} color={overrun ? 'error.main' : 'text.primary'}>
          {overrun ? 'loss' : 'margin'} {formatPaise(Math.abs(marginPaise))}
        </Box>
      </MUITypography>
      {overrun && (
        <MUITypography variant="body" sx={{ mt: 1 }}>
          This does not change what the customer owes. If the extra work was agreed with them, raise
          a change order instead so the contract reflects it.
        </MUITypography>
      )}
    </Alert>
  );
}

function SummaryStrip({ summary }: { summary: ProjectLedgerSummary }): JSX.Element {
  // Only worth explaining once the contract has moved off the quote. On a
  // project with no change orders the two are identical and a "quote ₹X + ₹0"
  // line would be pure noise — the tab is meant to be readable at a glance.
  const hasChangeOrders = summary.changeOrderPaise !== 0;

  // MUI palette tokens, not Tailwind colour utilities — Tailwind is layout only.
  const tiles: Array<{ label: string; value: number; tone: string; detail: string | null }> = [
    {
      label: 'Contract',
      value: summary.contractPaise,
      tone: 'text.primary',
      // Answers "where did this number come from?" on the screen where someone
      // would ask it. Without it the project list said ₹2,58,568 and this tab
      // said ₹2,98,568.04, with nothing anywhere reconciling them.
      detail: hasChangeOrders
        ? `quote ${formatPaise(summary.quotedPaise)} ${summary.changeOrderPaise > 0 ? '+' : '−'} ${formatPaise(Math.abs(summary.changeOrderPaise))} change orders`
        : null,
    },
    {
      label: 'Received',
      value: summary.receivedPaise,
      tone: 'success.main',
      detail: null,
    },
    {
      label: 'Outstanding',
      value: summary.outstandingPaise,
      tone: summary.outstandingPaise > 0 ? 'warning.main' : 'text.primary',
      detail: null,
    },
    { label: 'Spent', value: summary.spentPaise, tone: 'text.primary', detail: null },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} variant="outlined" component="div" sx={{ p: 2 }}>
          <MUITypography variant="metaLabel" component="dt">
            {t.label}
          </MUITypography>
          <MUITypography
            component="dd"
            variant="inherit"
            color={t.tone}
            sx={{
              mt: 0.5,
              fontSize: '1.125rem',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatPaise(t.value)}
          </MUITypography>
          {t.detail && (
            <MUITypography variant="finePrint" component="dd" sx={{ mt: 0.25 }}>
              {t.detail}
            </MUITypography>
          )}
        </Card>
      ))}
    </dl>
  );
}

function ProjectEntries({
  entries,
  isLoading,
  onReverse,
  onRegenerateReceipt,
}: {
  entries: LedgerEntry[];
  isLoading: boolean;
  onReverse: (entry: LedgerEntry) => void;
  /** Omitted when the project header data needed to render a receipt is absent. */
  onRegenerateReceipt?: (entry: LedgerEntry) => Promise<void>;
}): JSX.Element {
  // Which entries already carry a reversal.
  //
  // `reversesId` is the FORWARD pointer — it is set on the *reversing* row, so
  // testing it tells you whether an entry IS a reversal, never whether it HAS
  // been reversed. Using it as the guard left Reverse enabled on an
  // already-reversed receipt; the backend correctly returned 409 and the dialog
  // sat there saying nothing. Both halves of a pair are always in this list, so
  // the back-pointer is derivable here without another round trip.
  const reversedIds = new Set(
    entries.map((e) => e.reversesId).filter((id): id is string => Boolean(id)),
  );

  if (isLoading) return <Skeleton variant="rounded" height={140} />;

  if (entries.length === 0) {
    return (
      <section>
        <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
          Money in &amp; out
        </MUITypography>
        <Card variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed' }}>
          <MUITypography variant="placeholder">Nothing recorded yet.</MUITypography>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <MUITypography variant="sectionTitle" sx={{ mb: 1.5 }}>
        Money in &amp; out
      </MUITypography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Entry</TableCell>
              <TableCell>Detail</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow
                key={e.id}
                hover
                sx={e.reversesId ? { backgroundColor: 'action.hover' } : undefined}
              >
                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {e.valueDate}
                  {e.valueDateIsInferred && (
                    <Tooltip title="Date inferred from the record's creation time">
                      <span> ~</span>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>
                  {e.entryNo}
                </TableCell>
                <TableCell>
                  {/* A reversal is a correction, not a payment. Labelling it
                      explicitly is the audit trail doing its job. */}
                  {e.reversesId ? (
                    <Box component="span" color="text.secondary">
                      Reversal — {e.reversalReason ?? 'no reason given'}
                    </Box>
                  ) : (
                    <span>
                      {e.category ?? e.paymentMethod ?? e.entryType}
                      {e.counterparty ? ` · ${e.counterparty}` : ''}
                      {e.reference ? ` · ${e.reference}` : ''}
                    </span>
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                    color: e.amountPaise < 0 ? 'error.main' : 'success.main',
                  }}
                >
                  {formatPaise(e.amountPaise)}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {/* Reversals cannot themselves be reversed — reverse the
                      original. Nor can an entry be reversed twice: the backend
                      enforces that with a unique index and returns 409, so
                      offering the button was an invitation to a dead end. */}
                  {e.reversesId ? null : reversedIds.has(e.id) ? (
                    <MUITypography variant="finePrint">Reversed</MUITypography>
                  ) : (
                    <span className="inline-flex gap-1.5">
                      {/* Money in only, and never on a reversed entry — a
                          receipt for cash that bounced is worse than none. */}
                      {e.direction === 'in' && onRegenerateReceipt && (
                        <Tooltip title="Generate the receipt again and file it in the customer's documents">
                          <Button size="small" onClick={() => void onRegenerateReceipt(e)}>
                            Receipt
                          </Button>
                        </Tooltip>
                      )}
                      <Button size="small" color="inherit" onClick={() => onReverse(e)}>
                        Reverse
                      </Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}
