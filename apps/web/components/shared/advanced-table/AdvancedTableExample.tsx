'use client';

/**
 * AdvancedTableExample
 *
 * Reference implementation showing every AdvancedTable capability with
 * realistic dummy data. Copy the relevant section when wiring the table
 * to a feature (quotes, customers, properties, orders, …).
 */

// external
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { type JSX, useState } from 'react';

// aliases
import { AdvancedTable } from './Table';
import type { BulkAction, ColumnConfig } from './types';

import { formatCurrency, formatDate } from '@/lib/utils';

// relative

// ============================================================================
// Types
// ============================================================================

interface Quote extends Record<string, unknown> {
  id: string;
  quoteNumber: string;
  customer: string;
  property: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  amount: number;
  createdAt: string;
  expiresAt: string;
  assignedTo: string;
}

interface QuoteLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

// ============================================================================
// Dummy data
// ============================================================================

const QUOTES: Quote[] = [
  {
    id: '1',
    quoteNumber: 'QT-2025-001',
    customer: 'Greenfield Solar Ltd',
    property: '123 Main St, Sydney',
    status: 'sent',
    amount: 48500,
    createdAt: '2025-01-10',
    expiresAt: '2025-02-10',
    assignedTo: 'Alice Nguyen',
  },
  {
    id: '2',
    quoteNumber: 'QT-2025-002',
    customer: 'Blue Ridge Energy',
    property: '45 Harbour Rd, Melbourne',
    status: 'accepted',
    amount: 125000,
    createdAt: '2025-01-15',
    expiresAt: '2025-02-15',
    assignedTo: 'Bob Chen',
  },
  {
    id: '3',
    quoteNumber: 'QT-2025-003',
    customer: 'SunCorp Industries',
    property: '78 Beach Ave, Brisbane',
    status: 'draft',
    amount: 22750,
    createdAt: '2025-01-20',
    expiresAt: '2025-02-20',
    assignedTo: 'Carol Smith',
  },
  {
    id: '4',
    quoteNumber: 'QT-2025-004',
    customer: 'Apex Constructions',
    property: '9 Tower Blvd, Perth',
    status: 'rejected',
    amount: 89300,
    createdAt: '2025-01-22',
    expiresAt: '2025-02-22',
    assignedTo: 'David Kim',
  },
  {
    id: '5',
    quoteNumber: 'QT-2025-005',
    customer: 'ClearSkies Renewables',
    property: '200 Solar Way, Adelaide',
    status: 'expired',
    amount: 61200,
    createdAt: '2024-12-01',
    expiresAt: '2025-01-01',
    assignedTo: 'Eve Martinez',
  },
  {
    id: '6',
    quoteNumber: 'QT-2025-006',
    customer: 'Horizon Power Co',
    property: '1 Sunrise Ct, Darwin',
    status: 'sent',
    amount: 34800,
    createdAt: '2025-01-25',
    expiresAt: '2025-02-25',
    assignedTo: 'Frank Lee',
  },
  {
    id: '7',
    quoteNumber: 'QT-2025-007',
    customer: 'TerraVolt Systems',
    property: '88 Grid St, Hobart',
    status: 'accepted',
    amount: 210000,
    createdAt: '2025-01-28',
    expiresAt: '2025-03-28',
    assignedTo: 'Grace Wong',
  },
  {
    id: '8',
    quoteNumber: 'QT-2025-008',
    customer: 'Coastal Energy Group',
    property: '55 Cliff Rd, Canberra',
    status: 'draft',
    amount: 17400,
    createdAt: '2025-02-01',
    expiresAt: '2025-03-01',
    assignedTo: 'Henry Park',
  },
];

const QUOTE_LINE_ITEMS: Record<string, QuoteLineItem[]> = {
  '1': [
    { id: 'li-1', description: '6.6 kW Solar Panel System', qty: 1, unitPrice: 6500, total: 6500 },
    { id: 'li-2', description: 'Battery Storage 10 kWh', qty: 2, unitPrice: 9000, total: 18000 },
    {
      id: 'li-3',
      description: 'Installation & Commissioning',
      qty: 1,
      unitPrice: 4500,
      total: 4500,
    },
  ],
  '2': [
    { id: 'li-4', description: '100 kW Commercial Array', qty: 1, unitPrice: 85000, total: 85000 },
    { id: 'li-5', description: 'Monitoring System', qty: 1, unitPrice: 5000, total: 5000 },
    { id: 'li-6', description: 'Grid Connection', qty: 1, unitPrice: 15000, total: 15000 },
  ],
};

// ============================================================================
// Status chip — maps to feature constants pattern
// ============================================================================

const STATUS_COLORS: Record<
  Quote['status'],
  'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'error',
  expired: 'warning',
};

function StatusChip({ status }: { status: Quote['status'] }): JSX.Element {
  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={STATUS_COLORS[status]}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, textTransform: 'capitalize' }}
    />
  );
}

// ============================================================================
// Expanded row — line items
// ============================================================================

function QuoteLineItemsExpanded({ quoteId }: { quoteId: string }): JSX.Element {
  const items = QUOTE_LINE_ITEMS[quoteId] ?? [];

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No line items available.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        Line Items
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Description</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell>Unit Price</TableCell>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.qty}</TableCell>
              <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
              <TableCell>
                <strong>{formatCurrency(item.total)}</strong>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// ============================================================================
// Column definitions
// ============================================================================

const COLUMNS: ColumnConfig<Quote>[] = [
  {
    field: 'quoteNumber',
    headerName: 'Quote #',
    sortable: true,
    searchable: true,
    filterable: true,
    filterType: 'text',
    width: 130,
    renderCell: ({ value }) => (
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
        {value as string}
      </Typography>
    ),
  },
  {
    field: 'customer',
    headerName: 'Customer',
    sortable: true,
    searchable: true,
    filterable: true,
    filterType: 'text',
    flex: 1,
  },
  {
    field: 'property',
    headerName: 'Property',
    searchable: true,
    flex: 1,
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Draft', value: 'draft' },
      { label: 'Sent', value: 'sent' },
      { label: 'Accepted', value: 'accepted' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Expired', value: 'expired' },
    ],
    width: 110,
    renderCell: ({ value }) => <StatusChip status={value as Quote['status']} />,
  },
  {
    field: 'amount',
    headerName: 'Amount',
    type: 'number',
    sortable: true,
    filterable: true,
    filterType: 'range',
    width: 120,
    valueFormatter: (v): string => String(formatCurrency(Number(v))),
  },
  {
    field: 'assignedTo',
    headerName: 'Assigned To',
    sortable: true,
    searchable: true,
    filterable: true,
    filterType: 'text',
    width: 140,
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    type: 'date',
    sortable: true,
    filterable: true,
    filterType: 'date',
    width: 110,
    valueFormatter: (v): string => String(formatDate(v as string) ?? ''),
  },
  {
    field: 'expiresAt',
    headerName: 'Expires',
    type: 'date',
    sortable: true,
    width: 110,
    defaultHidden: true,
    valueFormatter: (v): string => String(formatDate(v as string) ?? ''),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    hideable: false,
    width: 110,
    actions: (_row) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="View">
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: navigate to quote detail via ROUTES constant
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: open edit drawer
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: open delete confirmation dialog
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    ),
  },
];

const BULK_ACTIONS: BulkAction<Quote>[] = [
  {
    label: 'Export',
    icon: <VisibilityIcon fontSize="small" />,
    onClick: (_rows) => {
      // TODO: trigger server-side export with selected IDs
    },
    color: 'primary',
  },
  {
    label: 'Delete',
    icon: <DeleteIcon fontSize="small" />,
    onClick: (_rows) => {
      // TODO: open bulk delete confirmation dialog
    },
    color: 'error',
  },
];

// ============================================================================
// Demo page
// ============================================================================

export function AdvancedTableExample(): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Quotes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track all quotes
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} size="small">
          New Quote
        </Button>
      </Stack>

      <Tabs
        value={activeTab}
        onChange={(_, v): void => setActiveTab(v as number)}
        sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label="Client-side mode" />
        <Tab label="Server-side mode (simulated)" />
      </Tabs>

      {activeTab === 0 && <ClientSideExample />}
      {activeTab === 1 && <ServerSideExample />}
    </Box>
  );
}

// ── Client-side example ────────────────────────────────────────────────────

function ClientSideExample(): JSX.Element {
  const [selectedQuotes, setSelectedQuotes] = useState<Quote[]>([]);

  return (
    <Box>
      {selectedQuotes.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {selectedQuotes.length} quote(s) selected:{' '}
          {selectedQuotes.map((q) => q.quoteNumber).join(', ')}
        </Typography>
      )}

      <AdvancedTable<Quote>
        columns={COLUMNS}
        rows={QUOTES}
        paginationMode="client"
        pageSize={5}
        pageSizeOptions={[5, 10, 25]}
        enableSearch
        enableFilters
        enableColumnVisibility
        enableRowSelection
        enableExportCsv
        enableUrlSync
        urlPrefix="quotes"
        itemLabel="quotes"
        emptyMessage="No quotes found. Create one to get started."
        bulkActions={BULK_ACTIONS}
        onRowSelectionChange={setSelectedQuotes}
        renderExpandedRow={(row) => <QuoteLineItemsExpanded quoteId={row.id} />}
        toolbarActions={
          <Button size="small" variant="outlined" color="primary">
            Import
          </Button>
        }
      />
    </Box>
  );
}

// ── Server-side example (simulated with a delay) ───────────────────────────

function ServerSideExample(): JSX.Element {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(3);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Quote[]>(QUOTES.slice(0, 3));
  const total = QUOTES.length;

  const simulateFetch = (newPage: number, newSize: number): void => {
    setLoading(true);
    setTimeout(() => {
      setRows(QUOTES.slice(newPage * newSize, newPage * newSize + newSize));
      setLoading(false);
    }, 600);
  };

  const handlePageChange = (newPage: number): void => {
    setPage(newPage);
    simulateFetch(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number): void => {
    setPageSize(newSize);
    setPage(0);
    simulateFetch(0, newSize);
  };

  return (
    <AdvancedTable<Quote>
      columns={COLUMNS}
      rows={rows}
      loading={loading}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      totalRowCount={total}
      pageSizeOptions={[3, 5, 10]}
      itemLabel="quotes"
      enableSearch={false}
      enableFilters
      enableColumnVisibility
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onSortChange={(_model) => {
        // TODO: pass sort to server query
      }}
      onFilterChange={(_filters) => {
        // TODO: pass filters to server query
      }}
      renderExpandedRow={(row) => <QuoteLineItemsExpanded quoteId={row.id} />}
    />
  );
}
