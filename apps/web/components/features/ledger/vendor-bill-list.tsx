'use client';

import NextLink from 'next/link';
import { type JSX } from 'react';

import { CrmStatusPill } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useVendorPayableEntries, type VendorPayableLine } from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate, formatPaymentMethod } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/** A balance is owed when positive and an advance when negative — same words as Payables. */
function balanceLabel(paise: number): string {
  return paise < 0 ? `Advance ${formatPaise(-paise)}` : formatPaise(paise);
}

/**
 * Which bills make up what we owe a vendor, and what has been paid.
 *
 * Every bill taken on credit and every payment, newest first, with the vendor's
 * balance after each line — so "we owe Arihant ₹20,000" can be traced to the
 * bills behind it. There is no bill-by-bill matching, so a line never claims to
 * be paid or unpaid; the running balance is what tells the story.
 *
 * Used in two places with two scopes: expanded under a vendor's row on
 * Payables, and as a tab on the vendor's own page.
 */
export function VendorBillList({ vendorId }: { vendorId: string }): JSX.Element {
  const query = useVendorPayableEntries(vendorId);
  const lines = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  if (query.isLoading) {
    return (
      <p style={{ margin: 0, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
        Loading bills…
      </p>
    );
  }
  if (query.isError) {
    return (
      <p style={{ margin: 0, fontSize: crm['text-row-sm'], color: color.danger }}>
        Could not load this vendor&apos;s bills. Try again.
      </p>
    );
  }
  if (lines.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
        No bills on credit or payments with this vendor yet.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          minWidth: 640,
          borderCollapse: 'collapse',
          fontSize: crm['text-row-sm'],
        }}
      >
        <thead>
          <tr style={{ color: color['text-tertiary'], textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', fontWeight: 600 }}>Date</th>
            <th style={{ padding: '6px 8px', fontWeight: 600 }}>Entry</th>
            <th style={{ padding: '6px 8px', fontWeight: 600 }}>Project</th>
            <th style={{ padding: '6px 8px', fontWeight: 600 }}>Type</th>
            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>
              Balance after
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line: VendorPayableLine) => {
            // A reversal and the line it undid both stay visible, muted, so the
            // history reads whole instead of a number jumping for no reason.
            const muted = line.isReversal || line.isReversed;
            return (
              <tr
                key={line.entryId}
                style={{
                  borderTop: `1px solid ${color.divider}`,
                  color: muted ? color['text-tertiary'] : undefined,
                }}
              >
                <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                  {formatBusinessDate(line.valueDate)}
                </td>
                <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{line.entryNo}</td>
                <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                  <NextLink
                    href={`${buildRoute(ROUTES.PROJECTS.DETAIL, { id: line.projectId })}?tab=finance`}
                    style={{ color: color.accent, textDecoration: 'none', fontWeight: 500 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {line.projectNumber}
                  </NextLink>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {line.kind === 'bill'
                      ? 'Bill on credit'
                      : `Payment${line.paymentMethod ? ` · ${formatPaymentMethod(line.paymentMethod)}` : ''}`}
                    {line.isReversal ? (
                      <CrmStatusPill label="Reversal" tone="neutral" dot={false} size="sm" />
                    ) : null}
                    {line.isReversed ? (
                      <CrmStatusPill label="Reversed" tone="neutral" dot={false} size="sm" />
                    ) : null}
                  </span>
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Signed by what the line does to the balance: a bill adds, a
                      payment takes away, and each one's reversal does the opposite. */}
                  {(line.kind === 'bill' ? line.amountPaise : -line.amountPaise) < 0 ? '−' : ''}
                  {formatPaise(Math.abs(line.amountPaise))}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}
                >
                  {balanceLabel(line.balanceAfterPaise)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {total > lines.length ? (
        <p
          style={{ margin: '8px 0 0', fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}
        >
          Showing the newest {lines.length} of {total} lines.
        </p>
      ) : null}
    </div>
  );
}
