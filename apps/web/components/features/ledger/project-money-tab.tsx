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
import { formatExpenseCategory } from './format-expense-category';
import { useReceiptPdf } from './hooks/use-receipt-pdf';
import { MilestoneWaterfall } from './milestone-waterfall';
import { ReceiptDates } from './receipt-dates';
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
import { usePaymentApprovals } from '@/lib/hooks/resources/payment-approvals';
import { useGatedAction } from '@/lib/rbac';
import { formatPaise } from '@/lib/utils/paise';

/**
 * How many pending rows the project tab lists inline. The count beside the
 * heading always comes from `total`, so a project with more than this shows the
 * true number and a pointer to the full queue rather than silently truncating.
 */
const PENDING_PREVIEW_LIMIT = 10;

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

  // Money-moving controls. `useGatedAction` keeps them clickable so a blocked
  // user gets told which permission they need, rather than a dead button.
  const recordPayment = useGatedAction(
    'finance.payments.record',
    () => setDialog('receipt'),
    'Record payment',
  );
  const recordExpense = useGatedAction(
    'finance.payments.record',
    () => setDialog('expense'),
    'Record expense',
  );
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);
  const [waiving, setWaiving] = useState<MilestoneBalance | null>(null);
  const receiptPdf = useReceiptPdf();
  // Deliberately rendered apart from the figures below: these have not reached
  // the ledger, so they are in neither Received nor Outstanding.
  const pendingApprovals = usePaymentApprovals({
    projectId,
    status: 'pending',
    limit: PENDING_PREVIEW_LIMIT,
  });

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
        <Button
          variant="contained"
          size="small"
          onClick={recordPayment.onGatedClick}
          aria-disabled={!recordPayment.allowed}
          sx={recordPayment.allowed ? undefined : { opacity: 0.5 }}
        >
          Record payment
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={recordExpense.onGatedClick}
          aria-disabled={!recordExpense.allowed}
          sx={recordExpense.allowed ? undefined : { opacity: 0.5 }}
        >
          Record expense
        </Button>
        <Button variant="outlined" size="small" onClick={() => setDialog('changeOrder')}>
          Add change order
        </Button>
      </div>

      {(pendingApprovals.data?.total ?? 0) > 0 && (
        <Alert severity="warning" icon={false}>
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>
            Awaiting approval ({pendingApprovals.data?.total ?? 0})
          </Box>
          <Box sx={{ fontSize: '0.8125rem', mb: 1 }}>
            Not counted in Received or Outstanding below. A second person must approve these before
            they affect the customer&apos;s balance.
          </Box>
          {pendingApprovals.data?.data.map((p) => (
            <Box key={p.id} sx={{ fontSize: '0.8125rem' }}>
              {p.requestNo} · {p.valueDate} · {formatPaise(Math.abs(p.amountPaise))}
              {p.reference ? ` · ${p.reference}` : ''}
            </Box>
          ))}
          {(pendingApprovals.data?.total ?? 0) > PENDING_PREVIEW_LIMIT && (
            <Box sx={{ fontSize: '0.8125rem', mt: 0.5, fontStyle: 'italic' }}>
              and {(pendingApprovals.data?.total ?? 0) - PENDING_PREVIEW_LIMIT} more — see Finance ›
              Payment Approvals
            </Box>
          )}
        </Alert>
      )}

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
          {/* Neither branch offers a refund: there is no refund entry type
              wired up anywhere, so promising one sent operators looking for a
              control that does not exist. */}
          {s.outstandingPaise > 0
            ? `${formatPaise(s.outstandingPaise)} still shows as outstanding below and this credit has not been applied to it. Record it against the milestone.`
            : 'Everything owed on this project is covered. This sits as credit on the customer’s account and is applied automatically to the next change order raised here.'}
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
        receiptBusy={receiptPdf.isBusy}
      />

      {(dialog === 'receipt' || dialog === 'expense') && (
        <RecordMoneyDialog
          open
          mode={dialog}
          projectId={projectId}
          milestones={s.milestones}
          onClose={() => setDialog(null)}
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
  receiptBusy,
}: {
  entries: LedgerEntry[];
  isLoading: boolean;
  onReverse: (entry: LedgerEntry) => void;
  /** Omitted when the project header data needed to render a receipt is absent. */
  onRegenerateReceipt?: (entry: LedgerEntry) => Promise<void>;
  /** Filing in progress. The hook refuses re-entry anyway; this makes it visible. */
  receiptBusy?: boolean;
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
                <TableCell>
                  <ReceiptDates
                    valueDate={e.valueDate}
                    createdAt={e.createdAt}
                    valueDateIsInferred={e.valueDateIsInferred}
                  />
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
                      {e.category
                        ? formatExpenseCategory(e.category)
                        : (e.paymentMethod ?? e.entryType)}
                      {e.counterparty ? ` · ${e.counterparty}` : ''}
                      {e.reference ? ` · ${e.reference}` : ''}
                    </span>
                  )}

                  {/* Who recorded it and who let it through. Both names, because
                      `createdBy` on a ledger entry is the APPROVER — approval is
                      what inserts the row — so showing one name would credit the
                      wrong person with taking the money. Entries predating the
                      approval queue carry neither, which is truthful. */}
                  {(e.recordedByName ?? e.approvedByName) && (
                    <MUITypography variant="finePrint" component="div">
                      {e.recordedByName ? `Recorded by ${e.recordedByName}` : null}
                      {e.recordedByName && e.approvedByName ? ' · ' : null}
                      {e.approvedByName ? `Approved by ${e.approvedByName}` : null}
                    </MUITypography>
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
                          {/* Disabled while a receipt is being filed. The hook
                              refuses re-entry regardless; this stops the button
                              looking clickable while it works, which is what
                              produced duplicate copies in the customer's
                              documents. */}
                          <span>
                            <Button
                              size="small"
                              disabled={receiptBusy}
                              onClick={() => void onRegenerateReceipt(e)}
                            >
                              Receipt
                            </Button>
                          </span>
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
