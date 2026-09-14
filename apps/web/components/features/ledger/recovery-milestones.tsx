'use client';

import { type JSX } from 'react';

import { ageingBucket } from './receivables-columns';

import { CrmStatusPill } from '@/components/shared/crm-table';
import { useProjectLedger, type MilestoneBalance } from '@/lib/hooks/resources/ledger';
import { color, crm } from '@/lib/theme/tokens';
import { formatBusinessDate } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

/**
 * Open means what the Recovery row counted: an active milestone with money
 * still due. `v_milestone_balance` reports active milestones as pending,
 * partial or paid, so pending/partial with a balance is exactly that set — and
 * these balances add up to the row's "Still owed".
 */
function isOpen(m: MilestoneBalance): boolean {
  return (m.derivedStatus === 'pending' || m.derivedStatus === 'partial') && m.balancePaise > 0;
}

const cell = { padding: '6px 8px', whiteSpace: 'nowrap' } as const;
const money = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as const;

/** The milestones behind one Recovery row, shown when the row is expanded. */
export function RecoveryMilestones({ projectId }: { projectId: string }): JSX.Element {
  const query = useProjectLedger(projectId);
  const open = (query.data?.milestones ?? []).filter(isOpen);

  if (query.isLoading) {
    return (
      <p style={{ margin: 0, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
        Loading milestones…
      </p>
    );
  }
  if (query.isError) {
    return (
      <p style={{ margin: 0, fontSize: crm['text-row-sm'], color: color.danger }}>
        Could not load this project&apos;s milestones. Try again.
      </p>
    );
  }
  if (open.length === 0) {
    // The list is a snapshot: a payment approved since it loaded can close the last one.
    return (
      <p style={{ margin: 0, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
        Nothing is open on this project any more.
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
            <th style={{ ...cell, fontWeight: 600 }}>Milestone</th>
            <th style={{ ...cell, fontWeight: 600 }}>Pays</th>
            <th style={{ ...cell, fontWeight: 600 }}>Due</th>
            <th style={{ ...money, fontWeight: 600 }}>Expected</th>
            <th style={{ ...money, fontWeight: 600 }}>Received</th>
            <th style={{ ...money, fontWeight: 600 }}>Short by</th>
            <th style={{ ...cell, fontWeight: 600 }}>Ageing</th>
          </tr>
        </thead>
        <tbody>
          {open.map((m) => {
            const { label, tone } = ageingBucket(m.daysOverdue);
            return (
              <tr key={m.milestoneId} style={{ borderTop: `1px solid ${color.divider}` }}>
                <td style={{ ...cell, whiteSpace: 'normal' }}>{m.name}</td>
                <td style={cell}>{m.payerType === 'lender' ? 'Bank' : 'Customer'}</td>
                <td style={cell}>
                  {m.dueDate ? (
                    formatBusinessDate(m.dueDate)
                  ) : (
                    <span style={{ color: color['text-tertiary'] }}>No due date</span>
                  )}
                </td>
                <td style={money}>{formatPaise(m.expectedPaise)}</td>
                <td style={money}>{formatPaise(m.allocatedPaise)}</td>
                <td style={{ ...money, fontWeight: 700, color: color.danger }}>
                  {formatPaise(m.balancePaise)}
                </td>
                <td style={cell}>
                  <CrmStatusPill label={label} tone={tone} size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
