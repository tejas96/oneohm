'use client';

import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, Stack } from '@mui/material';
import { type JSX, useCallback, useMemo, useState } from 'react';

import { DISCOM_SORT_FIELD_MAP, DISCOM_STATUS_TONE } from '../constants';
import { DiscomDeleteDialog } from './discom-delete-dialog';
import { DiscomExpandedRow } from './discom-expanded-row';
import { DiscomFormDrawer } from './discom-form-drawer';
import { DiscomKpiCards } from './discom-kpi-cards';
import { DiscomRowActionsMenu } from './discom-row-actions-menu';
import { type DiscomAdmin, useDiscomMutations, useDiscomsAdmin } from '../hooks/use-discoms-admin';
import { buildDiscomPathLabel, buildSubOfficerLabel } from '../utils/discom-display.util';

import {
  CrmStatusPill,
  CrmTable,
  type CrmBulkAction,
  type CrmColumn,
  type CrmQuickFilter,
} from '@/components/shared/crm-table';
import { PermissionGuard } from '@/components/shared/guards';
import { useTableUrlState } from '@/lib/hooks';
import { SUPERADMIN_ONLY } from '@/lib/rbac';
import { color, crm } from '@/lib/theme/tokens';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { buildCsv, downloadCsv, type CsvColumn } from '@/lib/utils/csv';

type DiscomRow = DiscomAdmin & Record<string, unknown>;
const EMPTY_ROWS: DiscomRow[] = [];

const STATUS_FILTER_KEY = 'status';
const CIRCLE_FILTER_KEY = 'circle';

function toApiSortField(model: { field: string; direction: 'asc' | 'desc' } | null): string {
  if (!model) return 'divisionName';
  return DISCOM_SORT_FIELD_MAP[model.field] ?? model.field;
}

function toApiSortOrder(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): 'ASC' | 'DESC' {
  if (!model) return 'ASC';
  return model.direction === 'desc' ? 'DESC' : 'ASC';
}

function AdminDiscomListPageContent(): JSX.Element {
  const urlState = useTableUrlState({ prefix: 'discom', defaultPageSize: 20 });
  const mutations = useDiscomMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscomAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscomAdmin | null>(null);

  const statusFilter = (urlState.state.filters[STATUS_FILTER_KEY] as string | undefined) ?? 'all';
  const circleFilter = (urlState.state.filters[CIRCLE_FILTER_KEY] as string | undefined) ?? 'all';

  const isActiveFilter =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

  const {
    data: discomData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useDiscomsAdmin({
    page: urlState.state.page + 1,
    limit: urlState.state.pageSize,
    search: urlState.state.search || undefined,
    sortBy: toApiSortField(urlState.state.sortModel),
    sortOrder: toApiSortOrder(urlState.state.sortModel),
    isActive: isActiveFilter,
    circleName: circleFilter !== 'all' ? circleFilter : undefined,
    includeInactive: true,
  });

  const tableRows = useMemo<DiscomRow[]>(
    () => (discomData?.data as DiscomRow[] | undefined) ?? EMPTY_ROWS,
    [discomData?.data],
  );

  const stats = discomData?.meta.stats;
  const circleNames = discomData?.meta.circleNames ?? [];

  const statusQuickFilters = useMemo<CrmQuickFilter[]>(() => {
    const total = discomData?.meta.total ?? 0;
    const active = stats?.active ?? 0;
    const inactive = Math.max(0, total - active);
    return [
      { key: 'all', label: 'All', count: total },
      { key: 'active', label: 'Active', count: active, tone: 'success', dot: true },
      { key: 'inactive', label: 'Inactive', count: inactive, tone: 'neutral', dot: true },
    ];
  }, [discomData?.meta.total, stats?.active]);

  const circleQuickFilters = useMemo<CrmQuickFilter[]>(() => {
    const chips: CrmQuickFilter[] = [{ key: 'all', label: 'All circles' }];
    circleNames.forEach((name) => chips.push({ key: name, label: name }));
    return chips;
  }, [circleNames]);

  const handleStatusFilter = useCallback(
    (key: string): void => {
      urlState.setFilters({ ...urlState.state.filters, [STATUS_FILTER_KEY]: key });
    },
    [urlState],
  );

  const handleCircleFilter = useCallback(
    (key: string): void => {
      urlState.setFilters({ ...urlState.state.filters, [CIRCLE_FILTER_KEY]: key });
    },
    [urlState],
  );

  const openCreate = useCallback((): void => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((discom: DiscomAdmin): void => {
    setEditTarget(discom);
    setFormOpen(true);
  }, []);

  const openDuplicate = useCallback((discom: DiscomAdmin): void => {
    setEditTarget({
      ...discom,
      id: '',
      sectionName: '',
      sectionEngineerName: '',
    });
    setFormOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    async (discom: DiscomAdmin): Promise<void> => {
      await mutations.update.mutateAsync({
        id: discom.id,
        data: { isActive: !discom.isActive },
      });
    },
    [mutations.update],
  );

  const handleDeleteRequest = useCallback((discom: DiscomAdmin): void => {
    setDeleteTarget(discom);
  }, []);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    await mutations.remove.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, mutations.remove]);

  const handleDeactivateInstead = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    await mutations.update.mutateAsync({ id: deleteTarget.id, data: { isActive: false } });
    setDeleteTarget(null);
  }, [deleteTarget, mutations.update]);

  const exportCsv = useCallback((rows: DiscomAdmin[]): void => {
    const columns: CsvColumn<DiscomAdmin>[] = [
      { header: 'Circle', accessor: (r) => r.circleName },
      { header: 'Division', accessor: (r) => r.divisionName },
      { header: 'Subdivision', accessor: (r) => r.subdivisionName ?? '' },
      { header: 'Section', accessor: (r) => r.sectionName ?? '' },
      { header: 'SE', accessor: (r) => r.circleInchargeName },
      { header: 'EE', accessor: (r) => r.divisionInchargeName },
      { header: 'Mobile', accessor: (r) => r.mobileNo ?? '' },
      { header: 'Email', accessor: (r) => r.email ?? '' },
      { header: 'Sites mapped', accessor: (r) => r.linkedPropertiesCount },
      { header: 'Active', accessor: (r) => r.isActive },
    ];
    downloadCsv(buildCsv(rows, columns), 'discoms-export.csv');
  }, []);

  const bulkActions = useMemo<CrmBulkAction<DiscomRow>[]>(
    () => [
      {
        label: 'Activate',
        variant: 'secondary',
        onClick: (rows) => {
          void Promise.all(
            rows.map((row) =>
              mutations.update.mutateAsync({ id: row.id, data: { isActive: true } }),
            ),
          );
        },
      },
      {
        label: 'Deactivate',
        variant: 'secondary',
        onClick: (rows) => {
          void Promise.all(
            rows.map((row) =>
              mutations.update.mutateAsync({ id: row.id, data: { isActive: false } }),
            ),
          );
        },
      },
      {
        label: 'Export',
        variant: 'secondary',
        onClick: (rows) => exportCsv(rows),
      },
    ],
    [exportCsv, mutations.update],
  );

  const columns = useMemo<CrmColumn<DiscomRow>[]>(
    () => [
      {
        field: 'hierarchy',
        header: 'Division & hierarchy',
        track: crm['col-discom-hierarchy'],
        sortable: true,
        sortField: 'divisionName',
        renderCell: (row) => (
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                fontSize: crm['text-row-title'],
                fontWeight: 600,
                color: color['text-primary'],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.divisionName}
            </Box>
            <Box
              sx={{
                fontSize: crm['text-row-sm'],
                color: color['text-tertiary'],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {buildDiscomPathLabel(row)}
            </Box>
          </Box>
        ),
      },
      {
        field: 'circle',
        header: 'Circle / SE',
        track: crm['col-discom-circle'],
        sortable: true,
        sortField: 'circleName',
        renderCell: (row) => (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: crm['text-row'], color: color['text-primary'] }}>
              {row.circleName}
            </Box>
            <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
              SE · {row.circleInchargeName}
            </Box>
          </Box>
        ),
      },
      {
        field: 'officers',
        header: 'Division & sub officers',
        track: crm['col-discom-officers'],
        renderCell: (row) => (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: crm['text-row'], color: color['text-secondary'] }}>
              EE · {row.divisionInchargeName}
            </Box>
            <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
              {buildSubOfficerLabel(row)}
            </Box>
          </Box>
        ),
      },
      {
        field: 'contact',
        header: 'Office contact',
        track: crm['col-discom-contact'],
        renderCell: (row) => (
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: crm['text-row'],
                color: color['text-secondary'],
              }}
            >
              {row.mobileNo || '—'}
            </Box>
            <Box
              sx={{
                fontSize: crm['text-row-sm'],
                color: color['text-tertiary'],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.email || '—'}
            </Box>
          </Box>
        ),
      },
      {
        field: 'sites',
        header: 'Sites',
        track: crm['col-discom-sites'],
        renderCell: (row) => (
          <Box>
            <Box sx={{ fontSize: crm['text-row'], fontWeight: 600, color: color['text-primary'] }}>
              {row.linkedPropertiesCount}
            </Box>
            <Box sx={{ fontSize: crm['text-row-xs'], color: color['text-tertiary'] }}>
              {row.linkedPropertiesCount === 1 ? 'site mapped' : 'sites mapped'}
            </Box>
          </Box>
        ),
      },
      {
        field: 'status',
        header: 'Status',
        track: crm['col-discom-status'],
        sortable: true,
        sortField: 'isActive',
        renderCell: (row) => (
          <CrmStatusPill
            label={row.isActive ? 'Active' : 'Inactive'}
            tone={DISCOM_STATUS_TONE[row.isActive ? 'active' : 'inactive']}
          />
        ),
      },
      {
        field: 'updatedAt',
        header: 'Updated',
        track: crm['col-discom-updated'],
        sortable: true,
        renderCell: (row) => (
          <Box sx={{ fontSize: crm['text-row'], color: color['text-secondary'] }}>
            {formatDate(row.updatedAt)}
          </Box>
        ),
      },
      {
        field: 'actions',
        header: '',
        track: crm['col-discom-actions'],
        align: 'right',
        hideable: false,
        stopPropagation: true,
        renderCell: (row) => (
          <DiscomRowActionsMenu
            discom={row}
            onEdit={openEdit}
            onDuplicate={openDuplicate}
            onToggleActive={(d) => void handleToggleActive(d)}
            onDelete={handleDeleteRequest}
          />
        ),
      },
    ],
    [handleDeleteRequest, handleToggleActive, openDuplicate, openEdit],
  );

  const renderExpandedRow = useCallback(
    (row: DiscomRow) => <DiscomExpandedRow discom={row} onEdit={() => openEdit(row)} />,
    [openEdit],
  );

  const hasActiveFilters =
    Boolean(urlState.state.search) || statusFilter !== 'all' || circleFilter !== 'all';

  const renderEmptyState = useCallback(
    (filtered: boolean): JSX.Element =>
      filtered ? (
        <Box
          sx={{ py: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}
        >
          <Box sx={{ fontSize: 14, fontWeight: 700 }}>Nothing matches those filters</Box>
          <Box
            sx={{ fontSize: crm['text-row'], color: color['text-secondary'], textAlign: 'center' }}
          >
            Try a different circle, or clear the search to see the whole utility list.
          </Box>
          <Button size="small" variant="outlined" onClick={urlState.resetAll} sx={{ mt: 0.5 }}>
            Clear filters
          </Button>
        </Box>
      ) : (
        <Box
          sx={{ py: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}
        >
          <Box sx={{ fontSize: 14, fontWeight: 700 }}>No DISCOMs yet</Box>
          <Box
            sx={{ fontSize: crm['text-row'], color: color['text-secondary'], textAlign: 'center' }}
          >
            Add the utility hierarchy your sites fall under — circle and division first, subdivision
            and section when you have them.
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 0.5 }}
            onClick={openCreate}
          >
            Add DISCOM
          </Button>
        </Box>
      ),
    [openCreate, urlState.resetAll],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { lg: 'flex-start' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
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
            Admin · Utility network
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
            DISCOMs
          </Box>
          <Box
            component="p"
            sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
          >
            The utility hierarchy sites are mapped to — circle, division, subdivision, section, and
            the officers who sign off net metering.
          </Box>
        </Box>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pt: { lg: 2.25 } }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add DISCOM
          </Button>
        </Stack>
      </Box>

      <DiscomKpiCards stats={stats} total={discomData?.meta.total} loading={isLoading} />

      {isError ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'error.light',
            backgroundColor: 'rgba(220,38,38,0.06)',
          }}
        >
          <ErrorOutlineIcon color="error" />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ fontSize: crm['text-row-title'], fontWeight: 700, color: color.danger }}>
              Failed to load DISCOMs
            </Box>
            <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}>
              {getErrorMessage(error)}
            </Box>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      ) : null}

      <CrmTable<DiscomRow>
        columns={columns}
        rows={tableRows}
        getRowId={(row) => row.id}
        loading={isLoading}
        refetching={isFetching && !isLoading}
        initialSearch={urlState.state.search}
        onSearchChange={urlState.setSearch}
        searchPlaceholder="Search circle, division, officer"
        searchWidth={crm['toolbar-search-width-discom']}
        gridMinWidth={crm['grid-min-width-discom']}
        quickFilters={statusQuickFilters}
        activeQuickFilter={statusFilter}
        onQuickFilterChange={handleStatusFilter}
        secondaryQuickFilters={circleQuickFilters}
        activeSecondaryQuickFilter={circleFilter}
        onSecondaryQuickFilterChange={handleCircleFilter}
        sortModel={urlState.state.sortModel}
        onSortChange={urlState.setSortModel}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={discomData?.meta.total ?? 0}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        enableRowSelection
        bulkActions={bulkActions}
        selectionLabel={(count) =>
          count === 1 ? '1 DISCOM selected' : `${count} DISCOMs selected`
        }
        renderExpandedRow={renderExpandedRow}
        renderEmptyState={() => renderEmptyState(hasActiveFilters)}
        itemLabel="DISCOMs"
      />

      <DiscomFormDrawer
        open={formOpen}
        discom={editTarget}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
      />

      <DiscomDeleteDialog
        open={Boolean(deleteTarget)}
        discom={deleteTarget}
        isPending={mutations.remove.isPending || mutations.update.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={() => void handleConfirmDelete()}
        onDeactivateInstead={() => void handleDeactivateInstead()}
      />
    </Box>
  );
}

export function AdminDiscomListPage(): JSX.Element {
  return (
    <PermissionGuard permission={SUPERADMIN_ONLY}>
      <AdminDiscomListPageContent />
    </PermissionGuard>
  );
}
