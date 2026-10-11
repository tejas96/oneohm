'use client';

import { useRouter } from 'next/navigation';
import { type JSX, useCallback, useState } from 'react';

import { MissingCommissionsStrip } from './missing-commissions-strip';
import { PeriodChips } from './period-chips';
import { ResellerRow, ResellerRowSkeleton } from './reseller-row';
import { useClientPage } from './use-client-page';

import {
  CalmListPage,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  StatTile,
  StatTiles,
  useListEntrance,
} from '@/components/shared/calm-list';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  useResellers,
  type ResellerPeriod,
  type ResellerSummary,
} from '@/lib/hooks/resources/resellers';
import { getErrorMessage } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

const RESELLER_NOUN = { one: 'reseller', many: 'resellers' };

/** A screenful; a longer page does not need a longer placeholder. */
const SKELETON_ROWS = 8;

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
  const { page, pageSize, totalRowCount, onPageChange, onPageSizeChange } = paged.tableProps;

  const open = useCallback(
    (r: ResellerSummary): void =>
      router.push(buildRoute(ROUTES.ORG.RESELLER_DETAIL, { id: r.resellerId })),
    [router],
  );

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(paged.pageRows.length);

  return (
    <CalmListPage
      // Four figures, the missing-commission strip and the period: too tall to pin.
      pinHeader={false}
      header={
        <>
          <ListTitle
            title="Resellers"
            sub="Who sends us customers, how many we win, and what we owe each reseller."
          />

          <div className="mb-2.5 empty:hidden">
            <MissingCommissionsStrip />
          </div>

          <StatTiles label="Reseller totals" className="mb-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Owed now"
              value={formatPaise(t?.owedPaise ?? 0)}
              note="approved, not yet paid"
            />
            <StatTile
              label="Pending approval"
              value={formatPaise(t?.pendingPaise ?? 0)}
              note="waiting for a yes"
            />
            <StatTile label="Paid" value={formatPaise(t?.paidPaise ?? 0)} note="all time" />
            <StatTile
              label="To recover"
              value={formatPaise(t?.toRecoverPaise ?? 0)}
              note="paid on deals that died"
              tone={(t?.toRecoverPaise ?? 0) > 0 ? 'danger' : 'default'}
            />
          </StatTiles>

          <PeriodChips value={period} onChange={setPeriod} />

          {(q.data?.resellerUnknownCount ?? 0) > 0 && (
            <p className="m-0 mt-2 px-1 text-[12px] text-foreground-secondary">
              {q.data?.resellerUnknownCount} lead(s) say &quot;Reseller&quot; but name nobody. Open
              them in Customers and pick the reseller.
            </p>
          )}
        </>
      }
      error={
        q.isError ? (
          <ListError
            title="Couldn’t load the resellers"
            message={getErrorMessage(q.error)}
            onRetry={() => void q.refetch()}
          />
        ) : null
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
          noun={RESELLER_NOUN}
          countUnknown={q.isError && !q.data}
        />
      }
    >
      {q.isLoading ? (
        <ListSkeleton
          rows={SKELETON_ROWS}
          label="Loading resellers"
          renderRow={() => <ResellerRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        q.isError ? null : (
          <ListEmpty title="No resellers yet. Add a user with Profile Type = Reseller in Admin → Users." />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {paged.pageRows.map((row, index) => (
            <ResellerRow
              key={row.resellerId}
              row={row}
              index={index}
              entering={entering}
              onOpen={open}
            />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
