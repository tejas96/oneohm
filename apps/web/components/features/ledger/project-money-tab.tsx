'use client';

import { Tooltip } from '@mui/material';
import { ArrowDownLeft, ArrowUpRight, IndianRupee, ReceiptText } from 'lucide-react';
import { type JSX, useState } from 'react';

import { ChangeOrderDialog, ReverseEntryDialog, WaiveMilestoneDialog } from './correction-dialogs';
import { formatExpenseCategory } from './format-expense-category';
import { useReceiptPdf } from './hooks/use-receipt-pdf';
import { MilestoneWaterfall } from './milestone-waterfall';
import { ReceiptDates } from './receipt-dates';
import { RecordMoneyDialog } from './record-money-dialog';

import {
  ColumnHeader,
  DetailCard,
  EmptyPane,
  Mono,
  ROW_BLEED,
  TONE,
  TonePill,
} from '@/components/features/projects/components/project-detail/primitives';
import type { ProjectDetail } from '@/components/features/projects/hooks/types';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/**
 * How many pending rows the project tab lists inline. The count beside the
 * heading always comes from `total`, so a project with more than this shows the
 * true number and a pointer to the full queue rather than silently truncating.
 */
const PENDING_PREVIEW_LIMIT = 10;

/*
 * Track widths sized to what the cells actually hold, measured rather than
 * guessed. Two were too narrow and their content simply overflowed, because
 * nothing in either cell truncates:
 *
 *  - Date was 104px. The block is two lines — the value date, and "Recorded
 *    5 Sept 2026" beneath it — and that second line runs 115px, so it spilled
 *    11px past its own track into the gap before Entry.
 *  - Actions was 128px. A receipt row carries both Receipt and Reverse, 147px
 *    together, so the pair started 19px to the LEFT of the track and sat under
 *    the amount.
 *
 * Widened to 120px and 152px, which clears both with a few pixels spare. Detail
 * is the 1fr track and simply absorbs the difference.
 */
const ENTRY_COLS = 'md:grid-cols-[120px_128px_minmax(0,1fr)_132px_152px]';

interface ProjectMoneyTabProps {
  projectId: string;
  /** Supplies the receipt header (customer, site, project). Already fetched by the parent. */
  project?: ProjectDetail;
  isActive?: boolean;
}

/** A pill action button in a card header. */
function HeaderAction({
  onClick,
  allowed,
  primary,
  icon,
  children,
}: {
  onClick: () => void;
  allowed: boolean;
  primary?: boolean;
  icon?: JSX.Element;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={!allowed}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-[12.5px] font-medium transition-[filter,transform,background-color] duration-fast active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        primary
          ? 'bg-primary text-white hover:brightness-105'
          : 'bg-background-tertiary text-foreground-secondary hover:text-foreground',
        !allowed && 'opacity-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * The project's money, on one screen.
 *
 * Milestones lead; the ledger sits underneath. Two queries, not the nine the
 * old Finance tab fired across three equal sub-tabs — which buried the question
 * anyone opens the page to answer: *is this customer behind?*
 */
export function ProjectMoneyTab({
  projectId,
  project,
  isActive = true,
}: ProjectMoneyTabProps): JSX.Element {
  const summary = useProjectLedger(projectId, { enabled: isActive });
  const entries = useProjectEntries(projectId, { enabled: isActive });
  const [dialog, setDialog] = useState<'receipt' | 'expense' | 'changeOrder' | null>(null);
  /*
   * The milestone a row's Record button was clicked on, so the receipt dialog
   * can open with the amount that milestone is still short by already filled
   * in. Cleared when the dialog closes and when the header's own Record
   * payment button opens it — that button is about the project, not any one
   * milestone, and inheriting the last row clicked would be a figure the
   * operator never asked for.
   */
  const [recordFor, setRecordFor] = useState<MilestoneBalance | null>(null);

  // Money-moving controls. `useGatedAction` keeps them clickable so a blocked
  // user gets told which permission they need, rather than a dead button.
  const recordPayment = useGatedAction(
    'finance.payments.record',
    () => {
      setRecordFor(null);
      setDialog('receipt');
    },
    'Record payment',
  );
  // The same gate, entered from a milestone row: identical permission, but it
  // remembers which milestone so the dialog can suggest its shortfall.
  const recordForMilestone = useGatedAction(
    'finance.payments.record',
    () => setDialog('receipt'),
    'Record payment',
  );
  const recordExpense = useGatedAction(
    'finance.payments.record',
    () => setDialog('expense'),
    'Record expense',
  );
  // A change order re-prices the project, so it moves money just as the other
  // two do.
  const addChangeOrder = useGatedAction(
    'finance.payments.record',
    () => setDialog('changeOrder'),
    'Add change order',
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
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-32 rounded-3xl" />
        <Skeleton className="col-span-12 h-64 rounded-3xl" />
      </div>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <DetailCard
        label="Money"
        isError
        onRetry={() => {
          void summary.refetch();
        }}
        errorHeight={200}
      >
        <span />
      </DetailCard>
    );
  }

  const s = summary.data;
  const pendingTotal = pendingApprovals.data?.total ?? 0;

  return (
    <div className="grid grid-cols-12 gap-4">
      <SummaryCard
        summary={s}
        onRecordPayment={recordPayment}
        onRecordExpense={recordExpense}
        onAddChangeOrder={addChangeOrder}
      />

      {pendingTotal > 0 ? (
        <DetailCard
          label="Awaiting approval"
          aside={`${pendingTotal} ${pendingTotal === 1 ? 'request' : 'requests'}`}
          className="col-span-12"
        >
          <p
            className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
            style={{ background: TONE.warning.tint, color: TONE.warning.ink }}
          >
            Not counted in Received or Outstanding. A second person must approve these before they
            move the customer&apos;s balance.
          </p>
          <ul className="flex flex-col gap-1">
            {pendingApprovals.data?.data.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline gap-x-2 text-[12.5px] text-foreground-secondary"
              >
                <Mono className="text-foreground">{p.requestNo}</Mono>
                <Mono>{p.valueDate}</Mono>
                <Mono className="font-medium text-foreground">
                  {formatPaise(Math.abs(p.amountPaise))}
                </Mono>
                {p.reference ? <span className="truncate">{p.reference}</span> : null}
              </li>
            ))}
          </ul>
          {pendingTotal > PENDING_PREVIEW_LIMIT ? (
            <p className="pt-2 text-[11.5px] text-foreground-tertiary">
              and {pendingTotal - PENDING_PREVIEW_LIMIT} more in Finance › Payment approvals
            </p>
          ) : null}
        </DetailCard>
      ) : null}

      <DetailCard
        label="Payment schedule"
        aside={`${s.milestoneCount} ${s.milestoneCount === 1 ? 'milestone' : 'milestones'}`}
        className="col-span-12"
      >
        <MilestoneWaterfall
          milestones={s.milestones}
          // The gate, not the raw setter: the waterfall opens the same receipt
          // dialog as the header button, so passing `setDialog` here would walk
          // straight past the gate declared for it.
          onRecordPayment={(milestoneId) => {
            setRecordFor(s.milestones.find((m) => m.milestoneId === milestoneId) ?? null);
            recordForMilestone.onGatedClick();
          }}
          onWaive={setWaiving}
        />
      </DetailCard>

      <ProjectEntries
        entries={entries.data ?? []}
        // Not `entries.isLoading`: react-query reports false for a DISABLED
        // query, and this one is disabled until the tab is active — so the
        // first frame drew "Nothing recorded yet" over a project that has
        // receipts. No data and no error means still loading.
        isLoading={entries.data === undefined && !entries.isError}
        isError={entries.isError}
        onRetry={() => {
          void entries.refetch();
        }}
        onReverse={setReversing}
        onRegenerateReceipt={project ? regenerateReceipt : undefined}
        receiptBusy={receiptPdf.isBusy}
      />

      {dialog === 'receipt' || dialog === 'expense' ? (
        <RecordMoneyDialog
          open
          mode={dialog}
          projectId={projectId}
          milestones={s.milestones}
          forMilestone={recordFor}
          onClose={() => {
            setDialog(null);
            setRecordFor(null);
          }}
        />
      ) : null}

      {dialog === 'changeOrder' ? (
        <ChangeOrderDialog
          open
          projectId={projectId}
          currentContractPaise={s.contractPaise}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {reversing ? (
        <ReverseEntryDialog
          open
          projectId={projectId}
          entry={reversing}
          onClose={() => setReversing(null)}
        />
      ) : null}

      {waiving ? (
        <WaiveMilestoneDialog
          open
          projectId={projectId}
          milestone={waiving}
          onClose={() => setWaiving(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * The four figures, the cost warning, and the credit note.
 *
 * Expenses never change what the customer owes — that stays the contract. But a
 * project whose costs have overrun the quote is losing money, and nothing in
 * the old module ever said so: quoted margin was assumed, never checked against
 * reality.
 */
function SummaryCard({
  summary: s,
  onRecordPayment,
  onRecordExpense,
  onAddChangeOrder,
}: {
  summary: ProjectLedgerSummary;
  onRecordPayment: { allowed: boolean; onGatedClick: () => void };
  onRecordExpense: { allowed: boolean; onGatedClick: () => void };
  onAddChangeOrder: { allowed: boolean; onGatedClick: () => void };
}): JSX.Element {
  // Only worth explaining once the contract has moved off the quote. On a
  // project with no change orders the two are identical and a "quote ₹X + ₹0"
  // line would be pure noise.
  const hasChangeOrders = s.changeOrderPaise !== 0;
  const marginPaise = s.contractPaise > 0 ? s.contractPaise - s.spentPaise : null;
  const usedPct = s.contractPaise > 0 ? Math.round((s.spentPaise / s.contractPaise) * 100) : 0;
  const overrun = marginPaise != null && marginPaise < 0;

  const figures: Array<{ label: string; value: number; ink?: string; detail?: string | null }> = [
    {
      label: 'Contract',
      value: s.contractPaise,
      // Answers "where did this number come from?" on the screen where someone
      // would ask it. Without it the project list said one figure and this tab
      // said another, with nothing anywhere reconciling them.
      detail: hasChangeOrders
        ? `quote ${formatPaise(s.quotedPaise)} ${s.changeOrderPaise > 0 ? '+' : '−'} ${formatPaise(Math.abs(s.changeOrderPaise))} in change orders`
        : null,
    },
    { label: 'Received', value: s.receivedPaise, ink: TONE.success.ink },
    {
      label: 'Outstanding',
      value: s.outstandingPaise,
      ink: s.outstandingPaise > 0 ? TONE.warning.ink : undefined,
    },
    { label: 'Spent', value: s.spentPaise },
  ];

  return (
    <DetailCard
      label="Money"
      className="col-span-12"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <HeaderAction
            primary
            onClick={onRecordPayment.onGatedClick}
            allowed={onRecordPayment.allowed}
            icon={<ArrowDownLeft className="size-3.5" strokeWidth={2} aria-hidden />}
          >
            Record payment
          </HeaderAction>
          <HeaderAction
            onClick={onRecordExpense.onGatedClick}
            allowed={onRecordExpense.allowed}
            icon={<ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />}
          >
            Record expense
          </HeaderAction>
          <HeaderAction onClick={onAddChangeOrder.onGatedClick} allowed={onAddChangeOrder.allowed}>
            Change order
          </HeaderAction>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
              {f.label}
            </dt>
            <dd
              className="mt-1.5 truncate text-[20px] font-bold leading-none tracking-[-0.025em] tabular-nums"
              style={{ color: f.ink ?? 'var(--ds-text-primary)' }}
            >
              {formatPaise(f.value)}
            </dd>
            {f.detail ? (
              <dd className="mt-1.5 text-[11px] leading-snug text-foreground-tertiary">
                {f.detail}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      {s.contractPaise > 0 && s.spentPaise > 0 && usedPct >= 80 ? (
        <p
          className="mt-4 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
          style={{
            background: overrun ? TONE.danger.tint : TONE.warning.tint,
            color: overrun ? TONE.danger.ink : TONE.warning.ink,
          }}
        >
          <span className="font-semibold">
            {overrun
              ? `Costs have passed the contract by ${formatPaise(Math.abs(marginPaise ?? 0))}.`
              : `Costs are at ${usedPct}% of the contract.`}
          </span>{' '}
          {overrun
            ? 'This does not change what the customer owes. If the extra work was agreed, raise a change order so the contract reflects it.'
            : `Margin left: ${formatPaise(Math.abs(marginPaise ?? 0))}.`}
        </p>
      ) : null}

      {/* Unallocated cash is money received that belongs to no milestone — an
          overpayment, or an advance taken before the schedule existed. The old
          model had nowhere to put it, so it was simply invisible. */}
      {s.unallocatedPaise > 0 ? (
        <p
          className="mt-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
          style={{
            background: s.outstandingPaise > 0 ? TONE.warning.tint : TONE.info.tint,
            color: s.outstandingPaise > 0 ? TONE.warning.ink : TONE.info.ink,
          }}
        >
          <span className="font-semibold">
            {formatPaise(s.unallocatedPaise)} received but not applied to any milestone.
          </span>{' '}
          {/* Two genuinely different situations. Credit alongside an outstanding
              balance is an anomaly worth naming — the previous copy promised the
              credit would apply itself, which it never did, so an overpaid
              customer sat on the chase list. Neither branch offers a refund:
              there is no refund entry type wired up anywhere. */}
          {s.outstandingPaise > 0
            ? `${formatPaise(s.outstandingPaise)} still shows as outstanding and this credit has not been applied to it. Record it against a milestone.`
            : 'Everything owed is covered. This sits as credit on the customer’s account and is applied automatically to the next change order raised here.'}
        </p>
      ) : null}
    </DetailCard>
  );
}

/** Every ledger entry on the project, newest first. */
function ProjectEntries({
  entries,
  isLoading,
  isError,
  onRetry,
  onReverse,
  onRegenerateReceipt,
  receiptBusy,
}: {
  entries: LedgerEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
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
  // sat there saying nothing.
  const reversedIds = new Set(
    entries.map((e) => e.reversesId).filter((id): id is string => Boolean(id)),
  );

  return (
    <DetailCard
      label="Money in and out"
      aside={
        entries.length > 0
          ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
          : undefined
      }
      isError={isError}
      onRetry={onRetry}
      className="col-span-12"
    >
      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyPane
          icon={<ReceiptText className="size-4" strokeWidth={2} />}
          title="Nothing recorded yet"
          description="Payments and expenses on this project show up here as they are approved."
        />
      ) : (
        <>
          <div
            className={cn('hidden items-center gap-3 pb-1.5 md:grid', ROW_BLEED, ENTRY_COLS)}
            aria-hidden
          >
            <ColumnHeader>Date</ColumnHeader>
            <ColumnHeader>Entry</ColumnHeader>
            <ColumnHeader>Detail</ColumnHeader>
            <ColumnHeader className="text-right">Amount</ColumnHeader>
            <ColumnHeader className="text-right">Actions</ColumnHeader>
          </div>

          {entries.map((e) => {
            const isReversal = Boolean(e.reversesId);
            const wasReversed = reversedIds.has(e.id);
            return (
              <div
                key={e.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl py-2.5 transition-colors duration-fast even:bg-surface-alt hover:bg-background-tertiary md:grid md:items-center md:gap-3',
                  ROW_BLEED,
                  ENTRY_COLS,
                  isReversal && 'opacity-70',
                )}
              >
                <div className="shrink-0 text-[11.5px]">
                  <ReceiptDates
                    valueDate={e.valueDate}
                    createdAt={e.createdAt}
                    valueDateIsInferred={e.valueDateIsInferred}
                  />
                </div>

                <Mono className="shrink-0 truncate text-[11.5px] text-foreground-secondary">
                  {e.entryNo}
                </Mono>

                <div className="min-w-0">
                  {/* A reversal is a correction, not a payment. Labelling it
                      explicitly is the audit trail doing its job. */}
                  {isReversal ? (
                    <span className="text-[12.5px] text-foreground-secondary">
                      Reversal — {e.reversalReason ?? 'no reason given'}
                    </span>
                  ) : (
                    <span className="block truncate text-[12.5px] text-foreground">
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
                      wrong person with taking the money. */}
                  {(e.recordedByName ?? e.approvedByName) ? (
                    <span className="mt-0.5 block truncate text-[11px] text-foreground-tertiary">
                      {e.recordedByName ? `Recorded by ${e.recordedByName}` : null}
                      {e.recordedByName && e.approvedByName ? ' · ' : null}
                      {e.approvedByName ? `Approved by ${e.approvedByName}` : null}
                    </span>
                  ) : null}
                </div>

                <Mono
                  className="shrink-0 whitespace-nowrap text-right text-[12.5px] font-medium"
                  style={{ color: e.amountPaise < 0 ? TONE.danger.ink : TONE.success.ink }}
                >
                  {formatPaise(e.amountPaise)}
                </Mono>

                <div className="flex shrink-0 items-center justify-end gap-1.5">
                  {/* Reversals cannot themselves be reversed — reverse the
                      original. Nor can an entry be reversed twice: the backend
                      enforces that with a unique index and returns 409, so
                      offering the button was an invitation to a dead end. */}
                  {isReversal ? null : wasReversed ? (
                    <TonePill label="Reversed" tone="neutral" />
                  ) : (
                    <>
                      {/* Money in only, and never on a reversed entry — a receipt
                          for cash that bounced is worse than none. */}
                      {e.direction === 'in' && onRegenerateReceipt ? (
                        <Tooltip title="Generate the receipt again and file it in the customer's documents">
                          <span>
                            <button
                              type="button"
                              disabled={receiptBusy}
                              onClick={() => void onRegenerateReceipt(e)}
                              className="inline-flex h-7 items-center gap-1 rounded-pill bg-accent-subtle px-2.5 text-[11.5px] font-medium text-primary-dark transition-[filter] duration-fast hover:brightness-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <IndianRupee className="size-3" strokeWidth={2} aria-hidden />
                              Receipt
                            </button>
                          </span>
                        </Tooltip>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onReverse(e)}
                        className="inline-flex h-7 items-center rounded-pill px-2.5 text-[11.5px] font-medium text-foreground-secondary transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Reverse
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </DetailCard>
  );
}
