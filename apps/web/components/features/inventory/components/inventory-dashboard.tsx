'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useSearchParams } from 'next/navigation';

import { DashboardActivityRail } from './dashboard/dashboard-activity-rail';
import { DashboardFinancialSection } from './dashboard/dashboard-financial-section';
import { DashboardKpiStrip } from './dashboard/dashboard-kpi-strip';
import { DashboardOpsSection } from './dashboard/dashboard-ops-section';

import { TimeWindowPicker } from '@/components/shared/inventory';
import { MUITypography } from '@/components/ui/mui-typography';
import { type StatsWindowInput } from '@/lib/hooks/resources/inventory-stats';
import { useAuth } from '@/providers/auth-provider';

/**
 * Inventory dashboard — orchestrator.
 *
 * Composes four sections — KPI strip, ops grid, financial grid,
 * activity rail — and feeds each one a single resolved `StatsWindowInput`
 * derived from the URL via `<TimeWindowPicker />`.
 *
 * Why a single window read here (not per-section): each section uses
 * 2-4 stats hooks. If every section called `useSearchParams()`
 * independently, switching the picker would trigger a wave of separate
 * re-renders. Reading once + threading down via a stable object means
 * one render pass when the URL changes.
 *
 * Permission gating: requires `inventory:read`. Users without it see
 * a friendly permission-denied state rather than a blank page or a
 * crash from the failed FDAL queries (which would 401-toast endlessly).
 *
 * Layout (from top to bottom):
 *   1. Header — title + TimeWindowPicker (sticky? no — kept inline so
 *      mobile users can scroll past it).
 *   2. KPI strip — 8 dense tiles (Total SKUs, Low Stock, In Transit,
 *      Pending POs, PO Spend, Outstanding, Active Allocations,
 *      Active Vendors). Outstanding is labelled "(status-based · A2)"
 *      until product confirms whether it should derive from
 *      paid_amount.
 *   3. Ops section — 2x2 grid: transactions stacked-bar trend,
 *      allocation funnel, dispatch funnel, top-low-stock items.
 *   4. Financial section — 2x2 grid: PO spend trend, top vendors,
 *      spend by warehouse, outstanding by vendor.
 *   5. Activity rail — last 20 inventory transactions adapted to the
 *      InventoryActivityTimeline shape (Part 11).
 *
 * Stock value over time is intentionally absent: it's blocked on the
 * plan's A1 decision (snapshot table vs derive-from-transactions).
 */

const RESERVED_PERMISSION = 'inventory:read';

export function InventoryDashboard(): React.JSX.Element {
  const { hasPermission } = useAuth();
  const canRead = hasPermission(RESERVED_PERMISSION);

  const searchParams = useSearchParams();
  const statsWindow: StatsWindowInput = {
    range: searchParams.get('range') ?? undefined,
    fromDate: searchParams.get('fromDate') ?? undefined,
    toDate: searchParams.get('toDate') ?? undefined,
  };

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <LockOutlinedIcon sx={{ fontSize: 40 }} className="text-foreground-tertiary" />
        <MUITypography variant="sectionTitle">No access to inventory</MUITypography>
        <MUITypography variant="body" className="max-w-md text-foreground-secondary">
          You don&apos;t have permission to view inventory data. Ask an administrator to grant you
          the <code>inventory:read</code> permission.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <MUITypography variant="drawerTitle">Inventory</MUITypography>
          <MUITypography variant="body" className="mt-1 text-foreground-secondary">
            Real-time view of stock, purchase, allocation, and dispatch activity.
          </MUITypography>
        </div>
        <TimeWindowPicker />
      </header>

      <DashboardKpiStrip statsWindow={statsWindow} />

      <section className="flex flex-col gap-3">
        <MUITypography variant="sectionTitle">Operations</MUITypography>
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DashboardOpsSection statsWindow={statsWindow} />
          <DashboardActivityRail className="xl:h-[460px]" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <MUITypography variant="sectionTitle">Financial</MUITypography>
        <DashboardFinancialSection statsWindow={statsWindow} />
      </section>
    </div>
  );
}
