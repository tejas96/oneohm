'use client';

import { Box } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { buildCommissionColumns, type CommissionAction } from './commission-columns';
import { CloseRecoveryDialog, EditCommissionDialog, ReasonDialog, RecordCommissionPaymentDialog } from './commission-dialogs';
import { PeriodChips, StatCard } from './stat-card';

import { CrmTable } from '@/components/shared/crm-table';
import { useCommissionMutations, useReseller, type CommissionRow, type ResellerPeriod } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

type Open =
  | { kind: 'edit'; row: CommissionRow }
  | { kind: 'cancel'; row: CommissionRow }
  | { kind: 'pay'; rows: CommissionRow[] }
  | { kind: 'recover'; row: CommissionRow }
  | null;

export function ResellerDetailPage({ id }: { id: string }): JSX.Element {
  const [period, setPeriod] = useState<ResellerPeriod>('fy');
  const q = useReseller(id, period);
  const m = useCommissionMutations();
  const [open, setOpen] = useState<Open>(null);

  const onAction = (a: CommissionAction, row: CommissionRow): void => {
    if (a === 'approve') m.approve.mutate(row.id);
    if (a === 'edit') setOpen({ kind: 'edit', row });
    if (a === 'cancel') setOpen({ kind: 'cancel', row });
    if (a === 'pay') setOpen({ kind: 'pay', rows: [row] });
    if (a === 'recover') setOpen({ kind: 'recover', row });
  };
  const columns = useMemo(() => buildCommissionColumns(onAction), []);

  const h = q.data?.reseller;
  const s = q.data?.summary;
  const rows = q.data?.commissions ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
      <Box>
        <Box
          component="span"
          sx={{
            fontSize: 'var(--text-overline-size)',
            fontWeight: 700,
            letterSpacing: 'var(--text-overline-track)',
            textTransform: 'uppercase',
            color: color['text-tertiary'],
          }}
        >
          Reseller
        </Box>
        <Box component="h1" sx={{ m: 0, mt: '5px', mb: '3px', fontSize: crm['text-page-title'], fontWeight: 700 }}>
          {h?.name ?? '…'}
        </Box>
        <Box component="p" sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}>
          {[
            h?.code,
            h?.ratePercent === null ? 'rate not set' : h ? `${h.ratePercent}%` : null,
            h?.status,
            h?.accountLast4 ? `${h.bankName ?? 'Bank'} ••••${h.accountLast4}` : 'No bank details',
            h?.gstin ? `GSTIN ${h.gstin}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' } }}>
        <StatCard label="Leads" value={String(s?.leads ?? 0)} note="in this period" />
        <StatCard label="Won" value={`${s?.won ?? 0} of ${s?.quoted ?? 0}`} note={s?.winRate === null || !s ? 'win rate —' : `win rate ${s.winRate}%`} />
        <StatCard label="Revenue" value={formatPaise(s?.revenuePaise ?? 0)} note="before GST, after discount" />
        <StatCard label="Owed now" value={formatPaise(s?.owedPaise ?? 0)} note="approved, not paid" />
        <StatCard label="Paid" value={formatPaise(s?.paidPaise ?? 0)} note="all time" />
        <StatCard label="To recover" value={formatPaise(s?.toRecoverPaise ?? 0)} note="paid on dead deals" danger={(s?.toRecoverPaise ?? 0) > 0} />
      </Box>

      <PeriodChips value={period} onChange={setPeriod} />

      <CrmTable<CommissionRow>
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        loading={q.isLoading}
        refetching={q.isFetching && !q.isLoading}
        // Default `grid-min-width` (1280px) is sized for a full list page —
        // this table lives in a detail pane (~1100px content) and its four
        // columns need far less, so the default forced horizontal scroll
        // with the maths/state/⋮ columns off-screen. Matches
        // `finance-payables-page.tsx`'s override for the same reason.
        gridMinWidth="760px"
        enableRowSelection
        bulkActions={[
          {
            label: 'Record payment',
            variant: 'primary',
            onClick: (sel) => {
              const ok = sel.filter((r) => r.state === 'approved');
              if (ok.length > 0) setOpen({ kind: 'pay', rows: ok });
            },
          },
        ]}
        selectionLabel={(n) => `${n} selected — only Approved rows are paid`}
        itemLabel="commissions"
        emptyMessage="No commissions yet. One appears the moment a quote for this reseller's customer is accepted."
      />

      {open?.kind === 'edit' && <EditCommissionDialog row={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'pay' && <RecordCommissionPaymentDialog rows={open.rows} onClose={() => setOpen(null)} />}
      {open?.kind === 'recover' && <CloseRecoveryDialog row={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'cancel' && (
        <ReasonDialog
          open
          title={`Cancel ${open.row.quoteNumber}`}
          description="The reseller will see this as Cancelled."
          confirmLabel="Cancel commission"
          busy={m.cancel.isPending}
          onClose={() => setOpen(null)}
          onConfirm={(reason) => m.cancel.mutate({ id: open.row.id, reason }, { onSuccess: () => setOpen(null) })}
        />
      )}
    </Box>
  );
}
