'use client';

import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useMemo, useState } from 'react';

import { MissingCommissionsStrip } from './missing-commissions-strip';
import { buildResellerColumns } from './resellers-columns';
import { PeriodChips, StatCard } from './stat-card';
import { useClientPage } from './use-client-page';

import { CrmTable } from '@/components/shared/crm-table';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  useResellers,
  type ResellerPeriod,
  type ResellerSummary,
} from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

/**
 * Every reseller, how they perform, and what we owe them right now.
 * Money cards are "right now"; the period only moves funnel and revenue.
 * Totals come from the API — never summed from the visible page.
 */
export function ResellersPage(): JSX.Element {
  const router = useRouter();
  const [period, setPeriod] = useState<ResellerPeriod>('fy');
  const q = useResellers(period);
  const rows = q.data?.rows ?? [];
  const t = q.data?.totals;
  const paged = useClientPage(rows);

  const open = (r: ResellerSummary): void =>
    router.push(buildRoute(ROUTES.ORG.RESELLER_DETAIL, { id: r.resellerId }));
  const columns = useMemo(() => buildResellerColumns(open), []);

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
          Finance
        </Box>
        <Box
          component="h1"
          sx={{
            m: 0,
            mt: '5px',
            mb: '3px',
            fontSize: crm['text-page-title'],
            fontWeight: 700,
            letterSpacing: crm['text-page-title-track'],
          }}
        >
          Resellers
        </Box>
        <Box
          component="p"
          sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
        >
          Who sends us customers, how many we win, and what we owe each reseller.
        </Box>
      </Box>

      <MissingCommissionsStrip />

      <Box
        sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' } }}
      >
        <StatCard
          label="Owed now"
          value={formatPaise(t?.owedPaise ?? 0)}
          note="approved, not yet paid"
        />
        <StatCard
          label="Pending approval"
          value={formatPaise(t?.pendingPaise ?? 0)}
          note="waiting for a yes"
        />
        <StatCard label="Paid" value={formatPaise(t?.paidPaise ?? 0)} note="all time" />
        <StatCard
          label="To recover"
          value={formatPaise(t?.toRecoverPaise ?? 0)}
          note="paid on deals that died"
          danger={(t?.toRecoverPaise ?? 0) > 0}
        />
      </Box>

      <PeriodChips value={period} onChange={setPeriod} />

      {(q.data?.resellerUnknownCount ?? 0) > 0 && (
        <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}>
          {q.data?.resellerUnknownCount} lead(s) say "Reseller" but name nobody. Open them in
          Customers and pick the reseller.
        </Box>
      )}

      <CrmTable<ResellerSummary>
        columns={columns}
        rows={paged.pageRows}
        {...paged.tableProps}
        getRowId={(r) => r.resellerId}
        loading={q.isLoading}
        refetching={q.isFetching && !q.isLoading}
        onRowClick={open}
        itemLabel="resellers"
        emptyMessage="No resellers yet. Add a user with Profile Type = Reseller in Admin → Users."
      />
    </Box>
  );
}
