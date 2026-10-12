'use client';

import { bankLabel } from '@tejas96/shared/constants';
import { LoanStatus, SubsidyStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import type { JSX } from 'react';

import {
  type CustomerLoanApplication,
  type CustomerPropertyResponse,
  useCustomerSubsidies,
} from '../hooks';
import { CardBones, CardError, EmptyNote, Line, PageCard, SubHeading, TEXT_ACTION } from './parts';

import { ReceiptDates } from '@/components/features/ledger/receipt-dates';
import { usePropertyFinanceSnapshot } from '@/components/features/properties/hooks';
import { QuietPill } from '@/components/shared/calm-list';
import type { CrmTone } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { usePaymentApprovals } from '@/lib/hooks/resources/payment-approvals';
import { cn, formatCurrency, formatDate, formatPaymentMethod, toTitleLabel } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

const LOAN_TONE: Record<LoanStatus, CrmTone> = {
  [LoanStatus.INITIATED]: 'warning',
  [LoanStatus.APPLIED]: 'info',
  [LoanStatus.APPROVED]: 'success',
  [LoanStatus.REJECTED]: 'danger',
  [LoanStatus.CANCELLED]: 'neutral',
};

const SUBSIDY_TONE: Record<SubsidyStatus, CrmTone> = {
  [SubsidyStatus.INITIATED]: 'neutral',
  [SubsidyStatus.SUBMITTED]: 'info',
  [SubsidyStatus.UNDER_REVIEW]: 'info',
  [SubsidyStatus.APPROVED]: 'success',
  [SubsidyStatus.DISBURSED]: 'success',
  [SubsidyStatus.REJECTED]: 'danger',
};

/** The same four ageing groups the Receivables screen has. */
function ageingGroup(daysOverdue: number): string {
  if (daysOverdue > 90) return '90+ days';
  if (daysOverdue > 60) return '61–90 days';
  if (daysOverdue > 30) return '31–60 days';
  return '1–30 days';
}

const plural = (count: number, one: string): string => (count === 1 ? one : `${one}s`);

/** The customer's row of the receivables ageing report. */
interface AllSitesMoney {
  totalOutstanding: number;
  overdue: number;
  openTermCount: number;
  /** Null when there is none; undefined while the receipts are still loading. */
  lastReceiptDate?: string | null;
}

export interface MoneyCardProps {
  customerId: string;
  site: CustomerPropertyResponse;
  /** The project that owns the roof today; null before conversion. */
  projectId: string | null;
  /** A cancelled project of the site: its money is still shown, as history. */
  cancelledProject?: { id: string; projectNumber?: string };
  /** The site's loan application, from the customer's loans. */
  loan: CustomerLoanApplication | null;
  loanState: { isLoading: boolean; isError: boolean; retry: () => void };
  /** Set when the customer has more than one site: the total across all of them. */
  allSites?: AllSitesMoney;
  delayMs?: number;
}

/**
 * The money of one site: what is still to pay, each payment term, the
 * payments, the loan and the subsidy application.
 *
 * Read only, as the two Finance tabs it replaces were. Every figure comes from
 * the hook the old site tab used (`usePropertyFinanceSnapshot`); nothing is
 * summed here that it does not already sum.
 */
export function MoneyCard({
  customerId,
  site,
  projectId: liveProjectId,
  cancelledProject,
  loan,
  loanState,
  allSites,
  delayMs,
}: MoneyCardProps): JSX.Element {
  // A cancelled project owns nothing now, but what was paid into it still happened.
  const projectId = liveProjectId ?? cancelledProject?.id ?? null;
  const cancelled = !liveProjectId && Boolean(cancelledProject);
  const { snapshot, openTerms, receipts, isTruncated, isLoading, isError, refetch } =
    usePropertyFinanceSnapshot(projectId, { enabled: Boolean(projectId) });
  const subsidiesQuery = useCustomerSubsidies(customerId, { enabled: Boolean(projectId) });
  const pendingQuery = usePaymentApprovals(
    { status: 'pending', kind: 'receipt', projectId: projectId ?? undefined, limit: 50 },
    { enabled: Boolean(projectId) },
  );

  const namedBank = site.financingBank ? bankLabel(site.financingBank) : '';
  const subsidies = (subsidiesQuery.data ?? []).filter(
    (subsidy) => subsidy.projectId === projectId,
  );
  const pending = pendingQuery.data?.data ?? [];
  const pendingPaise = pending.reduce((sum, row) => sum + row.amountPaise, 0);

  const paid = snapshot.receivedAmount;
  const left = snapshot.totalOutstanding;
  const barTotal = paid + left;
  const overdue = snapshot.overdueAmount > 0;

  // How old the overdue money is, from the terms' own day counts.
  const ageing = new Map<string, number>();
  for (const term of openTerms) {
    const days = term.daysOverdue ?? 0;
    if (days <= 0) continue;
    const group = ageingGroup(days);
    ageing.set(group, (ageing.get(group) ?? 0) + Number(term.outstandingAmount));
  }

  const loanBlock = (
    <>
      <SubHeading>Loan</SubHeading>
      {loanState.isLoading ? (
        <CardBones rows={1} />
      ) : loanState.isError ? (
        <CardError what="the loan" onRetry={loanState.retry} />
      ) : loan ? (
        <>
          <Line
            title={loan.lenderName || namedBank || 'Lender not set'}
            sub={[
              loan.loanAmount != null ? formatCurrency(loan.loanAmount) : 'Amount not set',
              loan.bankReferenceNumber ? `Ref ${loan.bankReferenceNumber}` : 'no bank reference',
            ].join(' · ')}
            right={
              <QuietPill label={toTitleLabel(loan.status)} tone={LOAN_TONE[loan.status]} whole />
            }
          />
          {!loan.lenderName && namedBank ? (
            <p className="m-0 text-[12px] text-foreground-tertiary">
              Named at onboarding. Not yet confirmed on the application.
            </p>
          ) : null}
          {loan.notes ? (
            <p className="m-0 mt-1 text-[13px] text-foreground-secondary">{loan.notes}</p>
          ) : null}
        </>
      ) : (
        <p className="m-0 text-[13px] text-foreground-secondary">
          {namedBank
            ? `${namedBank} was named at onboarding. No loan application is raised yet.`
            : 'No loan application.'}
        </p>
      )}
    </>
  );

  const allSitesLine = allSites ? (
    <p className="m-0 mt-3 rounded-xl bg-background-tertiary px-3 py-2 text-[13px] text-foreground-secondary">
      <b className="font-medium text-foreground">All sites:</b>{' '}
      {[
        `${formatCurrency(allSites.totalOutstanding)} still to pay`,
        allSites.overdue > 0 ? `${formatCurrency(allSites.overdue)} overdue` : 'nothing overdue',
        `${allSites.openTermCount} open ${plural(allSites.openTermCount, 'term')}`,
      ].join(' · ')}
      {allSites.lastReceiptDate
        ? ` · last payment ${formatDate(allSites.lastReceiptDate)}`
        : allSites.lastReceiptDate === null
          ? ' · no payment yet'
          : ''}
    </p>
  ) : null;

  if (!projectId) {
    return (
      <PageCard id="money" title="Money" delayMs={delayMs}>
        <EmptyNote
          title="No money yet"
          hint="Payment terms are made when this site becomes a project."
        />
        {allSitesLine}
        {loanBlock}
      </PageCard>
    );
  }

  return (
    <PageCard
      id="money"
      title={
        cancelled
          ? ['Money · cancelled project', cancelledProject?.projectNumber].filter(Boolean).join(' ')
          : 'Money'
      }
      delayMs={delayMs}
      action={
        <NextLink
          href={`${buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId })}?tab=finance`}
          prefetch={false}
          className={TEXT_ACTION}
        >
          Open project money →
        </NextLink>
      }
    >
      {isLoading ? (
        <CardBones rows={5} />
      ) : isError ? (
        <CardError what="the money" onRetry={refetch} />
      ) : (
        <>
          <div
            className={cn(
              'text-[24px] font-semibold tracking-[-0.02em] tabular-nums',
              overdue && 'text-error',
            )}
          >
            {formatCurrency(left)}{' '}
            <span className="text-[13px] font-normal tracking-normal text-foreground-secondary">
              {left <= 0
                ? 'nothing left to pay'
                : overdue
                  ? `still to pay · oldest ${snapshot.maxDaysOverdue} ${plural(snapshot.maxDaysOverdue, 'day')} overdue`
                  : 'still to pay · nothing overdue'}
            </span>
          </div>

          {barTotal > 0 ? (
            <div
              role="img"
              aria-label={`${formatCurrency(paid)} received of ${formatCurrency(barTotal)}`}
              className="mb-2.5 mt-3.5 flex h-2.5 overflow-hidden rounded-pill bg-background-tertiary"
            >
              <i
                className="block h-full bg-primary"
                style={{ width: `${(paid / barTotal) * 100}%` }}
              />
              <i
                className={cn('block h-full', overdue ? 'bg-[#FCA5A5]' : 'bg-gray-200')}
                style={{ width: `${(left / barTotal) * 100}%` }}
              />
            </div>
          ) : null}

          <dl className="m-0 grid grid-cols-3 gap-2 tabular-nums [&_dd]:m-0 [&_dd]:text-[15px] [&_dd]:font-semibold [&_dt]:text-[12px] [&_dt]:text-foreground-tertiary">
            <div className="flex flex-col-reverse">
              <dt>Contract</dt>
              <dd>{formatCurrency(snapshot.contractAmount)}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt>Received</dt>
              <dd>{formatCurrency(paid)}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt>Still to pay</dt>
              <dd>{formatCurrency(left)}</dd>
            </div>
          </dl>
          {snapshot.changeOrderAmount !== 0 ? (
            <p className="m-0 mt-1.5 text-[12px] text-foreground-tertiary">
              The contract includes {formatCurrency(snapshot.changeOrderAmount)} of change orders.
            </p>
          ) : null}
          {snapshot.waivedAmount > 0 ? (
            <p className="m-0 mt-1.5 text-[12px] text-foreground-tertiary">
              {formatCurrency(snapshot.waivedAmount)} was waived. It is not in "still to pay".
            </p>
          ) : null}
          {snapshot.cancelledAmount > 0 ? (
            <p className="m-0 mt-1.5 text-[12px] text-foreground-tertiary">
              {formatCurrency(snapshot.cancelledAmount)} of terms were cancelled with the project.
            </p>
          ) : null}
          {snapshot.refundedAmount > 0 ? (
            <p className="m-0 mt-1.5 text-[12px] text-foreground-tertiary">
              {formatCurrency(snapshot.refundedAmount)} was paid back to the customer.
            </p>
          ) : null}
          {allSitesLine}

          {ageing.size > 0 || pending.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[...ageing.entries()].map(([group, amount]) => (
                <QuietPill
                  key={group}
                  label={`${group} · ${formatCurrency(amount)}`}
                  tone="danger"
                  whole
                />
              ))}
              {pending.length > 0 ? (
                <NextLink
                  href={`${ROUTES.FINANCE.APPROVALS}?open=${encodeURIComponent(pending[0]?.id ?? '')}`}
                  prefetch={false}
                  title="Recorded, and not yet approved. It is not in the balance above."
                >
                  <QuietPill
                    label={`${formatPaise(pendingPaise)} waiting for approval`}
                    tone="info"
                    whole
                  />
                </NextLink>
              ) : null}
            </div>
          ) : null}

          <SubHeading>Payment terms · {openTerms.length} open</SubHeading>
          {openTerms.length === 0 ? (
            <p className="m-0 text-[13px] text-foreground-secondary">
              {cancelled
                ? 'The open terms were cancelled with the project.'
                : paid > 0
                  ? 'Fully collected.'
                  : 'No open payment term.'}
            </p>
          ) : (
            <table className="w-full border-collapse text-[13px] tabular-nums">
              <thead>
                <tr className="text-[12px] text-foreground-tertiary [&_th]:pb-1.5 [&_th]:font-medium">
                  <th className="text-left">Term</th>
                  <th className="pl-3 text-right">Expected</th>
                  <th className="pl-3 text-right">Paid</th>
                  <th className="pl-3 text-right">Left</th>
                </tr>
              </thead>
              <tbody>
                {openTerms.map((term) => {
                  const days = term.daysOverdue ?? 0;
                  // The stage is usually the name again; it earns a line only when it differs.
                  const stage = term.stage ? toTitleLabel(term.stage) : '';
                  const showStage =
                    stage !== '' && stage.toLowerCase() !== term.name.trim().toLowerCase();
                  return (
                    <tr key={term.id} className="border-t border-border align-top [&_td]:py-[7px]">
                      <td>
                        {term.name}
                        {showStage ? (
                          <div className="text-[12px] text-foreground-tertiary">{stage}</div>
                        ) : null}
                        <div
                          className={cn(
                            'text-[12px]',
                            days > 0 ? 'text-error' : 'text-foreground-tertiary',
                          )}
                        >
                          {term.dueDate
                            ? `due ${formatDate(term.dueDate)}${days > 0 ? ` · ${days} ${plural(days, 'day')} overdue` : ''}`
                            : 'No date set'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap pl-3 text-right">
                        {formatCurrency(Number(term.expectedAmount))}
                      </td>
                      <td className="whitespace-nowrap pl-3 text-right">
                        {formatCurrency(Number(term.paidAmount))}
                      </td>
                      <td className="whitespace-nowrap pl-3 text-right font-semibold">
                        {formatCurrency(Number(term.outstandingAmount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {isTruncated ? (
            <p className="m-0 mt-1.5 text-[12px] text-foreground-tertiary">
              Only the first {openTerms.length} terms are listed, and the figures above cover only
              those. Open the project for all of them.
            </p>
          ) : null}

          <SubHeading>Payments received · {receipts.length}</SubHeading>
          {receipts.length === 0 ? (
            <p className="m-0 text-[13px] text-foreground-secondary">No payment recorded yet.</p>
          ) : (
            receipts.map((entry) => {
              const reversal = Boolean(entry.reversesId);
              return (
                <Line
                  key={entry.id}
                  title={<span className="tabular-nums">{entry.entryNo}</span>}
                  sub={
                    <>
                      <ReceiptDates
                        variant="inline"
                        valueDate={entry.valueDate}
                        createdAt={entry.createdAt}
                        valueDateIsInferred={entry.valueDateIsInferred}
                      />
                      {entry.paymentMethod ? ` · ${formatPaymentMethod(entry.paymentMethod)}` : ''}
                      {entry.reference ? ` · Ref ${entry.reference}` : ''}
                      {reversal ? ` · Reversal — ${entry.reversalReason ?? 'correction'}` : ''}
                    </>
                  }
                  right={
                    <span className={cn('tabular-nums', reversal && 'text-[var(--ds-warning)]')}>
                      {formatPaise(entry.amountPaise)}
                    </span>
                  }
                />
              );
            })
          )}
        </>
      )}

      {loanBlock}

      <SubHeading>Subsidy application</SubHeading>
      {subsidiesQuery.isLoading ? (
        <CardBones rows={1} />
      ) : subsidiesQuery.isError ? (
        <CardError what="the subsidy" onRetry={() => void subsidiesQuery.refetch()} />
      ) : subsidies.length === 0 ? (
        <p className="m-0 text-[13px] text-foreground-secondary">
          No subsidy application on record.
        </p>
      ) : (
        subsidies.map((subsidy) => (
          <Line
            key={subsidy.id}
            title={<span className="tabular-nums">{subsidy.applicationNumber}</span>}
            sub={[
              subsidy.subsidyScheme,
              formatDate(subsidy.applicationDate),
              `applied ${formatCurrency(subsidy.appliedAmount)}`,
              subsidy.approvedAmount != null
                ? `approved ${formatCurrency(subsidy.approvedAmount)}`
                : 'approval pending',
            ]
              .filter(Boolean)
              .join(' · ')}
            right={
              <QuietPill
                label={toTitleLabel(subsidy.status)}
                tone={SUBSIDY_TONE[subsidy.status]}
                whole
              />
            }
          />
        ))
      )}
    </PageCard>
  );
}
