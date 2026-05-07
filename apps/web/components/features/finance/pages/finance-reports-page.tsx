'use client';

import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RequestPageOutlinedIcon from '@mui/icons-material/RequestPageOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { Button, CircularProgress, TextField } from '@mui/material';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import {
  CSV_CAP,
  DateRangePicker,
  buildCsv,
  downloadCsv,
  resolveFyPresetRange,
  type CsvColumn,
  type DateRangeValue,
} from '../shared';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUITypography,
} from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import type {
  CustomerAging,
  OrgExpenseListItem,
  OrgReceiptListItem,
  OutstandingTerm,
  ProjectProfitability,
} from '@/lib/hooks/resources';

/**
 * Finance Reports launchpad — 7 cards, each opens an export dialog
 * that hits an existing /finance/* endpoint and downloads a CSV.
 *
 * Why this exists alongside per-page CSV export buttons: this page is
 * the "I just want a deliverable" entry point for non-finance users
 * who don't want to learn the ledger filters first. It also pre-fills
 * the FY-aware "this fiscal year" range as the most common scope.
 *
 * V1 scope: all 7 reports use date range as their primary scope.
 * Vendor/Customer Statements add a free-text name filter on top
 * (substring match against the existing endpoint search params).
 * Per-entity dropdown pickers can come later — V1 keeps it as a
 * deliberate single-screen launchpad with no nested entity-search.
 */

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  scope: 'date' | 'date+vendor' | 'date+customer' | 'asOfDate';
  /** Async exporter; receives the selected scope, returns nothing once download fires. */
  run: (
    args: { from?: string; to?: string; scopeText?: string; asOfDate?: string },
    headers: Record<string, string>,
  ) => Promise<{ rows: number; truncated: boolean }>;
}

// ============================================================================
// Per-report exporters
// ============================================================================

async function exportReceipts(
  args: { from?: string; to?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  const { data } = await apiClient.get<PaginatedResponse<OrgReceiptListItem>>(
    '/finance/receipts',
    {
      headers,
      params: { dateFrom: args.from, dateTo: args.to, page: 1, limit: CSV_CAP },
    },
  );
  const cols: CsvColumn<OrgReceiptListItem>[] = [
    { header: 'Date', accessor: (r) => formatDate(r.createdAt, 'medium') },
    { header: 'Receipt #', accessor: (r) => r.paymentNumber },
    { header: 'Project #', accessor: (r) => r.projectNumber },
    { header: 'Project', accessor: (r) => r.projectName },
    { header: 'Customer', accessor: (r) => r.customerName },
    { header: 'Amount', accessor: (r) => Number(r.paidAmount) },
    { header: 'Method', accessor: (r) => r.paymentMethod },
    { header: 'Status', accessor: (r) => r.status },
  ];
  downloadCsv(buildCsv(data.data, cols), `receipts-${args.from ?? 'all'}-${args.to ?? 'all'}.csv`);
  return { rows: data.data.length, truncated: data.data.length === CSV_CAP };
}

async function exportExpenses(
  args: { from?: string; to?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  const { data } = await apiClient.get<PaginatedResponse<OrgExpenseListItem>>(
    '/finance/expenses',
    {
      headers,
      params: { dateFrom: args.from, dateTo: args.to, page: 1, limit: CSV_CAP },
    },
  );
  const cols: CsvColumn<OrgExpenseListItem>[] = [
    { header: 'Date', accessor: (e) => formatDate(e.expenseDate, 'medium') },
    { header: 'Expense #', accessor: (e) => e.expenseNumber },
    { header: 'Project #', accessor: (e) => e.projectNumber },
    { header: 'Project', accessor: (e) => e.projectName },
    { header: 'Vendor', accessor: (e) => e.vendorName ?? '' },
    { header: 'Category', accessor: (e) => e.category },
    { header: 'Amount', accessor: (e) => Number(e.amount) },
    { header: 'Paid By', accessor: (e) => e.paidBy },
    { header: 'Reimbursement', accessor: (e) => e.reimbursementStatus },
  ];
  downloadCsv(buildCsv(data.data, cols), `expenses-${args.from ?? 'all'}-${args.to ?? 'all'}.csv`);
  return { rows: data.data.length, truncated: data.data.length === CSV_CAP };
}

async function exportArAging(
  args: { asOfDate?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  const { data } = await apiClient.get<CustomerAging[]>('/finance/customers/ar', {
    headers,
    params: args.asOfDate ? { asOfDate: args.asOfDate } : undefined,
  });
  const cols: CsvColumn<CustomerAging>[] = [
    { header: 'Customer', accessor: (c) => c.customerName },
    { header: 'Phone', accessor: (c) => c.customerPhone ?? '' },
    { header: 'Email', accessor: (c) => c.customerEmail ?? '' },
    { header: 'Total Outstanding', accessor: (c) => c.totalOutstanding },
    { header: 'Current', accessor: (c) => c.current },
    { header: '0-30', accessor: (c) => c.bucket0to30 },
    { header: '31-60', accessor: (c) => c.bucket31to60 },
    { header: '61-90', accessor: (c) => c.bucket61to90 },
    { header: '90+', accessor: (c) => c.bucket90plus },
    { header: 'Open Terms', accessor: (c) => c.openTermCount },
  ];
  downloadCsv(buildCsv(data, cols), `ar-aging-${args.asOfDate ?? 'today'}.csv`);
  return { rows: data.length, truncated: false };
}

async function exportOutstanding(
  _args: { from?: string; to?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  // Outstanding endpoint doesn't take date range — it's "as of now".
  const { data } = await apiClient.get<PaginatedResponse<OutstandingTerm>>(
    '/finance/outstanding',
    { headers, params: { page: 1, limit: CSV_CAP, sort: 'dueDate', sortOrder: 'ASC' } },
  );
  const cols: CsvColumn<OutstandingTerm>[] = [
    { header: 'Due Date', accessor: (t) => (t.dueDate ? formatDate(t.dueDate, 'medium') : '') },
    { header: 'Project #', accessor: (t) => t.projectNumber },
    { header: 'Project', accessor: (t) => t.projectName },
    { header: 'Customer', accessor: (t) => t.customerName },
    { header: 'Term', accessor: (t) => t.name },
    { header: 'Expected', accessor: (t) => Number(t.expectedAmount) },
    { header: 'Paid', accessor: (t) => Number(t.paidAmount) },
    { header: 'Outstanding', accessor: (t) => Number(t.outstandingAmount) },
    { header: 'Days Overdue', accessor: (t) => t.daysOverdue ?? '' },
    { header: 'Aging', accessor: (t) => t.agingBucket },
    { header: 'Status', accessor: (t) => t.status },
  ];
  downloadCsv(buildCsv(data.data, cols), 'outstanding-terms.csv');
  return { rows: data.data.length, truncated: data.data.length === CSV_CAP };
}

async function exportProfitability(
  args: { from?: string; to?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  const { data } = await apiClient.get<PaginatedResponse<ProjectProfitability>>(
    '/finance/projects/profitability',
    { headers, params: { from: args.from, to: args.to, page: 1, limit: CSV_CAP } },
  );
  const cols: CsvColumn<ProjectProfitability>[] = [
    { header: 'Project #', accessor: (p) => p.projectNumber },
    { header: 'Project', accessor: (p) => p.projectName },
    { header: 'Customer', accessor: (p) => p.customerName },
    { header: 'Quoted Revenue', accessor: (p) => p.quotedRevenue },
    { header: 'Received', accessor: (p) => p.receivedAmount },
    { header: 'Total Spend', accessor: (p) => p.totalSpend },
    { header: 'Margin', accessor: (p) => p.margin },
    { header: 'Margin %', accessor: (p) => Number(p.marginPct.toFixed(1)) },
    { header: 'BOM Target', accessor: (p) => p.bomTarget },
    { header: 'BOM Variance', accessor: (p) => p.bomVariance },
  ];
  downloadCsv(
    buildCsv(data.data, cols),
    `profitability-${args.from ?? 'all'}-${args.to ?? 'all'}.csv`,
  );
  return { rows: data.data.length, truncated: data.data.length === CSV_CAP };
}

async function exportVendorStatement(
  args: { from?: string; to?: string; scopeText?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  // Reuses /finance/expenses with vendorSearch substring (case-insensitive on backend).
  const { data } = await apiClient.get<PaginatedResponse<OrgExpenseListItem>>(
    '/finance/expenses',
    {
      headers,
      params: {
        dateFrom: args.from,
        dateTo: args.to,
        vendorSearch: args.scopeText || undefined,
        page: 1,
        limit: CSV_CAP,
      },
    },
  );
  const cols: CsvColumn<OrgExpenseListItem>[] = [
    { header: 'Date', accessor: (e) => formatDate(e.expenseDate, 'medium') },
    { header: 'Expense #', accessor: (e) => e.expenseNumber },
    { header: 'Vendor', accessor: (e) => e.vendorName ?? '' },
    { header: 'Project #', accessor: (e) => e.projectNumber },
    { header: 'Project', accessor: (e) => e.projectName },
    { header: 'Category', accessor: (e) => e.category },
    { header: 'Amount', accessor: (e) => Number(e.amount) },
    { header: 'Paid By', accessor: (e) => e.paidBy },
    { header: 'Reimbursement', accessor: (e) => e.reimbursementStatus },
  ];
  const slug = (args.scopeText ?? 'all').replace(/\s+/g, '-').toLowerCase();
  downloadCsv(
    buildCsv(data.data, cols),
    `vendor-statement-${slug}-${args.from ?? 'all'}-${args.to ?? 'all'}.csv`,
  );
  return { rows: data.data.length, truncated: data.data.length === CSV_CAP };
}

async function exportCustomerStatement(
  args: { from?: string; to?: string; scopeText?: string },
  headers: Record<string, string>,
): Promise<{ rows: number; truncated: boolean }> {
  // Reuses /finance/receipts with the existing free-text search param,
  // which the backend matches against paymentNumber/reference/customerName.
  const { data } = await apiClient.get<PaginatedResponse<OrgReceiptListItem>>(
    '/finance/receipts',
    {
      headers,
      params: {
        dateFrom: args.from,
        dateTo: args.to,
        search: args.scopeText || undefined,
        page: 1,
        limit: CSV_CAP,
      },
    },
  );
  const cols: CsvColumn<OrgReceiptListItem>[] = [
    { header: 'Date', accessor: (r) => formatDate(r.createdAt, 'medium') },
    { header: 'Receipt #', accessor: (r) => r.paymentNumber },
    { header: 'Customer', accessor: (r) => r.customerName },
    { header: 'Project #', accessor: (r) => r.projectNumber },
    { header: 'Project', accessor: (r) => r.projectName },
    { header: 'Amount', accessor: (r) => Number(r.paidAmount) },
    { header: 'Method', accessor: (r) => r.paymentMethod },
    { header: 'Status', accessor: (r) => r.status },
  ];
  const slug = (args.scopeText ?? 'all').replace(/\s+/g, '-').toLowerCase();
  downloadCsv(
    buildCsv(data.data, cols),
    `customer-statement-${slug}-${args.from ?? 'all'}-${args.to ?? 'all'}.csv`,
  );
  return { rows: data.data.length, truncated: data.data.length === CSV_CAP };
}

const REPORTS: ReportConfig[] = [
  {
    id: 'receipts',
    title: 'Receipts Statement',
    description: 'All receipts in a date range — receipt #, project, customer, amount, status.',
    icon: <PaidOutlinedIcon />,
    scope: 'date',
    run: (args, headers) => exportReceipts({ from: args.from, to: args.to }, headers),
  },
  {
    id: 'expenses',
    title: 'Expenses Statement',
    description: 'All posted expenses in a date range — date, vendor, project, category, amount.',
    icon: <ReceiptLongOutlinedIcon />,
    scope: 'date',
    run: (args, headers) => exportExpenses({ from: args.from, to: args.to }, headers),
  },
  {
    id: 'ar-aging',
    title: 'AR Aging Report',
    description: 'Per-customer outstanding split by aging buckets, as of a chosen date.',
    icon: <AccountBalanceWalletOutlinedIcon />,
    scope: 'asOfDate',
    run: (args, headers) => exportArAging({ asOfDate: args.asOfDate }, headers),
  },
  {
    id: 'outstanding',
    title: 'Outstanding Terms',
    description: 'Every unpaid payment term across the org, sorted by due date.',
    icon: <RequestPageOutlinedIcon />,
    scope: 'date',
    run: (_args, headers) => exportOutstanding({}, headers),
  },
  {
    id: 'profitability',
    title: 'Project Profitability',
    description: 'Per-project margin: quoted revenue, received, total spend, BOM variance.',
    icon: <TrendingUpOutlinedIcon />,
    scope: 'date',
    run: (args, headers) => exportProfitability({ from: args.from, to: args.to }, headers),
  },
  {
    id: 'vendor',
    title: 'Vendor Statement',
    description: 'Expenses for a single vendor (case-insensitive name match) in a date range.',
    icon: <BusinessOutlinedIcon />,
    scope: 'date+vendor',
    run: (args, headers) => exportVendorStatement(args, headers),
  },
  {
    id: 'customer',
    title: 'Customer Statement',
    description: 'Receipts for a single customer (name/receipt # search) in a date range.',
    icon: <GroupOutlinedIcon />,
    scope: 'date+customer',
    run: (args, headers) => exportCustomerStatement(args, headers),
  },
];

// ============================================================================
// Page + Dialog
// ============================================================================

export function FinanceReportsPage(): React.JSX.Element {
  const [activeReport, setActiveReport] = React.useState<ReportConfig | null>(null);

  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Reports &amp; Exports</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          One-click CSV exports for the most common finance deliverables. Each report exports up
          to {CSV_CAP.toLocaleString('en-IN')} rows; narrow the date range if your set is larger.
        </MUITypography>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveReport(r)}
              className="border-border-light bg-surface hover:border-primary hover:bg-surface-secondary group flex h-full flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors"
            >
              <div className="text-foreground-secondary group-hover:text-primary flex h-9 w-9 items-center justify-center rounded-md bg-background-secondary transition-colors">
                {r.icon}
              </div>
              <MUITypography variant="bodyPrimary">{r.title}</MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-secondary">
                {r.description}
              </MUITypography>
              <span className="text-primary mt-auto inline-flex items-center gap-1 text-xs font-medium">
                <FileDownloadOutlinedIcon fontSize="inherit" /> Configure &amp; export
              </span>
            </button>
          ))}
        </div>
      </div>

      <ReportExportDialog
        report={activeReport}
        open={activeReport !== null}
        onOpenChange={(o) => {
          if (!o) setActiveReport(null);
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ReportExportDialogProps {
  report: ReportConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReportExportDialog({
  report,
  open,
  onOpenChange,
}: ReportExportDialogProps): React.JSX.Element | null {
  const { orgHeaders } = useOrgContext();
  const [range, setRange] = React.useState<DateRangeValue>(
    () => resolveFyPresetRange('this-fy') ?? {},
  );
  const [asOfDate, setAsOfDate] = React.useState<string>(() => todayIsoDate());
  const [scopeText, setScopeText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Reset transient inputs when switching reports.
  React.useEffect(() => {
    setScopeText('');
  }, [report?.id]);

  if (!report) return null;

  const handleExport = async (): Promise<void> => {
    setBusy(true);
    showToast.info('Preparing export…');
    try {
      const result = await report.run(
        {
          from: range.from,
          to: range.to,
          asOfDate,
          scopeText: scopeText.trim() || undefined,
        },
        orgHeaders,
      );
      if (result.truncated) {
        showToast.warning(
          `Result truncated at ${CSV_CAP.toLocaleString('en-IN')} rows. Narrow the range to export the full set.`,
        );
      } else {
        showToast.success(`Exported ${result.rows.toLocaleString('en-IN')} rows`);
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      showToast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="default">
      <MUIDialogHeader>
        <MUIDialogTitle>{report.title}</MUIDialogTitle>
        <MUIDialogDescription>{report.description}</MUIDialogDescription>
      </MUIDialogHeader>
      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          {report.scope === 'asOfDate' ? (
            <TextField
              type="date"
              label="As of date"
              size="small"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value || todayIsoDate())}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          ) : (
            <div>
              <MUITypography variant="finePrint" className="text-foreground-secondary mb-1 block">
                Date range
              </MUITypography>
              <DateRangePicker value={range} onChange={setRange} />
            </div>
          )}

          {report.scope === 'date+vendor' && (
            <TextField
              label="Vendor name (case-insensitive substring; leave blank for all)"
              size="small"
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              fullWidth
            />
          )}
          {report.scope === 'date+customer' && (
            <TextField
              label="Customer / receipt search (leave blank for all)"
              size="small"
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              fullWidth
            />
          )}
        </div>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button onClick={() => onOpenChange(false)} color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleExport()}
          disabled={busy}
          startIcon={
            busy ? <CircularProgress size={14} color="inherit" /> : <FileDownloadOutlinedIcon />
          }
        >
          {busy ? 'Exporting…' : 'Export CSV'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
