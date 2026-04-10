'use client';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Box, Checkbox, TableCell, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { type JSX, memo } from 'react';

import type { ColumnConfig, TableSortModel } from './types';
import { toggleSortDirection } from './utils';

// ============================================================================
// Types
// ============================================================================

interface AdvancedTableHeaderProps<TRow> {
  columns: ColumnConfig<TRow>[];
  visibleColumns: Set<string>;
  sortModel: TableSortModel | null;
  onSortChange: (model: TableSortModel | null) => void;
  enableRowSelection?: boolean;
  allSelected?: boolean;
  someSelected?: boolean;
  onSelectAll?: (checked: boolean) => void;
  hasExpandableRows?: boolean;
}

// ============================================================================
// Component
// ============================================================================

function AdvancedTableHeaderInner<TRow>({
  columns,
  visibleColumns,
  sortModel,
  onSortChange,
  enableRowSelection,
  allSelected,
  someSelected,
  onSelectAll,
  hasExpandableRows,
}: AdvancedTableHeaderProps<TRow>): JSX.Element {
  const handleSort = (field: string): void => {
    if (sortModel?.field === field) {
      const next = toggleSortDirection(sortModel.direction);
      onSortChange(next ? { field, direction: next } : null);
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  const headerCellSx = {
    backgroundColor: 'grey.50',
    borderBottom: '1px solid',
    borderColor: 'divider',
    py: 1.25,
    px: 2,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  } as const;

  const headerTextSx = {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'text.secondary',
  };

  return (
    <TableHead>
      <TableRow>
        {/* Expand toggle spacer */}
        {hasExpandableRows && (
          <TableCell padding="none" sx={{ ...headerCellSx, width: 40, minWidth: 40 }} />
        )}

        {/* Row selection */}
        {enableRowSelection && (
          <TableCell padding="checkbox" sx={headerCellSx}>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={(e) => onSelectAll?.(e.target.checked)}
              sx={{ p: 0.5 }}
            />
          </TableCell>
        )}

        {/* Data columns */}
        {columns
          .filter((col) => visibleColumns.has(col.field))
          .map((col) => {
            const isSorted = sortModel?.field === col.field;
            const direction = isSorted ? sortModel.direction : undefined;

            return (
              <TableCell
                key={col.field}
                sortDirection={direction}
                sx={{
                  ...headerCellSx,
                  width: col.width,
                  ...(col.flex ? { flex: col.flex } : {}),
                }}
              >
                {col.sortable ? (
                  <TableSortLabel
                    active={isSorted}
                    direction={direction ?? 'asc'}
                    onClick={() => handleSort(col.field)}
                    IconComponent={
                      isSorted
                        ? direction === 'asc'
                          ? ArrowUpwardIcon
                          : ArrowDownwardIcon
                        : UnfoldMoreIcon
                    }
                    sx={{
                      '& .MuiTableSortLabel-icon': {
                        fontSize: 14,
                        opacity: isSorted ? 1 : 0.4,
                      },
                      ...headerTextSx,
                      '&.Mui-active': { color: 'primary.main' },
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    {col.headerName}
                  </TableSortLabel>
                ) : (
                  <Box component="span" sx={headerTextSx}>
                    {col.headerName}
                  </Box>
                )}
              </TableCell>
            );
          })}
      </TableRow>
    </TableHead>
  );
}

export const AdvancedTableHeader = memo(
  AdvancedTableHeaderInner,
) as typeof AdvancedTableHeaderInner;
