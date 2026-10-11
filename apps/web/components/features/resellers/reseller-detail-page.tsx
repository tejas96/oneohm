'use client';

import { Alert, Box, Button } from '@mui/material';
import Link from 'next/link';
import { type JSX, useCallback, useEffect, useState } from 'react';

import {
  CloseRecoveryDialog,
  EditCommissionDialog,
  ReasonDialog,
  RecordCommissionPaymentDialog,
} from './commission-dialogs';
import { CommissionRowCard, CommissionRowSkeleton, type CommissionAction } from './commission-row';
import { PeriodChips } from './period-chips';
import { useClientPage } from './use-client-page';

import {
  CalmListPage,
  ListEmpty,
  ListPager,
  ListSkeleton,
  ListTitle,
  SelectionBar,
  StatTile,
  StatTiles,
  useListEntrance,
} from '@/components/shared/calm-list';
import { showToast } from '@/components/ui/sonner';
import { ROUTES } from '@/lib/config/routes';
import {
  useCommissionMutations,
  useReseller,
  type CommissionRow,
  type ResellerPeriod,
} from '@/lib/hooks/resources/resellers';
import { getErrorMessage } from '@/lib/utils/error';
import { formatPaise } from '@/lib/utils/paise';

const COMMISSION_NOUN = { one: 'commission', many: 'commissions' };

/** A screenful; a longer page does not need a longer placeholder. */
const SKELETON_ROWS = 6;

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

  const { mutate: approve } = m.approve;
  const onAction = useCallback(
    (a: CommissionAction, row: CommissionRow): void => {
      if (a === 'approve') approve(row.id);
      if (a === 'edit') setOpen({ kind: 'edit', row });
      if (a === 'cancel') setOpen({ kind: 'cancel', row });
      if (a === 'pay') setOpen({ kind: 'pay', rows: [row] });
      if (a === 'recover') setOpen({ kind: 'recover', row });
    },
    [approve],
  );

  const h = q.data?.reseller;
  const s = q.data?.summary;
  const rows = q.data?.commissions ?? [];
  const paged = useClientPage(rows);
  const { pageRows } = paged;
  const { page, pageSize, totalRowCount, onPageChange, onPageSizeChange } = paged.tableProps;

  // ── Ticked rows (bulk "Record payment"). A row that leaves the page drops
  // out of the ticks, as it did in the table. ──
  const [tickedIds, setTickedIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    setTickedIds((current) => {
      if (current.size === 0) return current;
      const available = new Set(pageRows.map((row) => row.id));
      const next = new Set([...current].filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [pageRows]);
  const handleTick = useCallback((row: CommissionRow, ticked: boolean): void => {
    setTickedIds((current) => {
      const next = new Set(current);
      if (ticked) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  }, []);
  const tickedRows = pageRows.filter((row) => tickedIds.has(row.id));

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(pageRows.length);

  if (q.isError) {
    const notFound = q.error?.response?.status === 404;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
        <Link href={ROUTES.ORG.RESELLERS}>← All resellers</Link>
        <Alert severity={notFound ? 'warning' : 'error'}>
          {notFound
            ? 'Reseller not found. The link may be wrong, or this is not a reseller.'
            : getErrorMessage(q.error)}
        </Alert>
      </Box>
    );
  }

  return (
    <CalmListPage
      // Six figures and the period: too tall to pin.
      pinHeader={false}
      header={
        <>
          <ListTitle
            title={h?.name ?? '…'}
            sub={[
              h?.code,
              h?.ratePercent === null ? 'rate not set' : h ? `${h.ratePercent}%` : null,
              h?.status,
              h?.accountLast4 ? `${h.bankName ?? 'Bank'} ••••${h.accountLast4}` : 'No bank details',
              h?.gstin ? `GSTIN ${h.gstin}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />

          <StatTiles
            label="This reseller's figures"
            className="mb-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
          >
            <StatTile compact label="Leads" value={String(s?.leads ?? 0)} note="in this period" />
            <StatTile
              compact
              label="Won"
              value={`${s?.won ?? 0} of ${s?.quoted ?? 0}`}
              note={s?.winRate === null || !s ? 'win rate —' : `win rate ${s.winRate}%`}
            />
            <StatTile
              compact
              label="Revenue"
              value={formatPaise(s?.revenuePaise ?? 0)}
              note="before GST, after discount"
            />
            <StatTile
              compact
              label="Owed now"
              value={formatPaise(s?.owedPaise ?? 0)}
              note="approved, not paid"
            />
            <StatTile compact label="Paid" value={formatPaise(s?.paidPaise ?? 0)} note="all time" />
            <StatTile
              compact
              label="To recover"
              value={formatPaise(s?.toRecoverPaise ?? 0)}
              note="paid on dead deals"
              tone={(s?.toRecoverPaise ?? 0) > 0 ? 'danger' : 'default'}
            />
          </StatTiles>

          <PeriodChips value={period} onChange={setPeriod} />
        </>
      }
      isFetching={q.isFetching}
      isLoading={q.isLoading}
      page={page}
      footer={
        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={totalRowCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          noun={COMMISSION_NOUN}
        />
      }
      overlays={
        <>
          {tickedRows.length > 0 ? (
            <SelectionBar
              label={`${tickedRows.length} selected — only Approved rows are paid`}
              onClear={() => setTickedIds(new Set())}
            >
              {tickedRows.length < pageRows.length ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setTickedIds(new Set(pageRows.map((row) => row.id)))}
                >
                  Select all {pageRows.length}
                </Button>
              ) : null}
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  const ok = tickedRows.filter((r) => r.state === 'approved');
                  if (ok.length > 0) setOpen({ kind: 'pay', rows: ok });
                  else
                    showToast.info(
                      'None of the selected rows is Approved. Only Approved rows can be paid.',
                    );
                }}
              >
                Record payment
              </Button>
            </SelectionBar>
          ) : null}

          {open?.kind === 'edit' && (
            <EditCommissionDialog row={open.row} onClose={() => setOpen(null)} />
          )}
          {open?.kind === 'pay' && (
            <RecordCommissionPaymentDialog
              rows={open.rows}
              onClose={() => setOpen(null)}
              // Sent: nothing stays ticked — the rows it held are now "in
              // review" and cannot be paid again.
              onSent={() => setTickedIds(new Set())}
            />
          )}
          {open?.kind === 'recover' && (
            <CloseRecoveryDialog row={open.row} onClose={() => setOpen(null)} />
          )}
          {open?.kind === 'cancel' && (
            <ReasonDialog
              open
              title={`Cancel ${open.row.quoteNumber}`}
              description="The reseller will see this as Cancelled."
              confirmLabel="Cancel commission"
              busy={m.cancel.isPending}
              onClose={() => setOpen(null)}
              onConfirm={(reason) =>
                m.cancel.mutate({ id: open.row.id, reason }, { onSuccess: () => setOpen(null) })
              }
            />
          )}
        </>
      }
    >
      {q.isLoading ? (
        <ListSkeleton
          rows={SKELETON_ROWS}
          label="Loading commissions"
          renderRow={() => <CommissionRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        <ListEmpty title="No commissions yet. One appears the moment a quote for this reseller's customer is accepted." />
      ) : (
        <div className="flex flex-col gap-2">
          {pageRows.map((row, index) => (
            <CommissionRowCard
              key={row.id}
              row={row}
              index={index}
              entering={entering}
              ticked={tickedIds.has(row.id)}
              onTick={handleTick}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
