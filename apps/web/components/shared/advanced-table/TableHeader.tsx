'use client';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Box, Checkbox, TableCell, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { type JSX, memo, useCallback, useEffect, useRef, useState } from 'react';

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

  // ── Column resize ────────────────────────────────────────────────────────
  // colWidths is committed state — set once on mouseup, not on every mousemove.
  // Live width during drag is tracked in dragRef to avoid re-renders mid-drag.
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    columns.forEach((c) => {
      if (c.width) init[c.field] = c.width;
    });
    return init;
  });

  // Seed widths for any new columns added after mount (e.g. dynamic column sets)
  useEffect(() => {
    setColWidths((prev) => {
      const additions: Record<string, number> = {};
      columns.forEach((c) => {
        if (c.width && !(c.field in prev)) additions[c.field] = c.width;
      });
      return Object.keys(additions).length > 0 ? { ...prev, ...additions } : prev;
    });
  }, [columns]);

  const dragRef = useRef<{
    field: string;
    startX: number;
    startWidth: number;
    currentWidth: number;
  } | null>(null);

  // Attach/clean up drag listeners on document (stable across renders)
  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      dragRef.current.currentWidth = Math.max(60, dragRef.current.startWidth + delta);
    };

    const onUp = (): void => {
      if (!dragRef.current) return;
      const { field, currentWidth } = dragRef.current;
      dragRef.current = null;
      // Single setState on release — no re-renders during drag
      setColWidths((prev) => ({ ...prev, [field]: currentWidth }));
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleResizeMouseDown = useCallback(
    (field: string, width: number) =>
      (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
          field,
          startX: e.clientX,
          startWidth: width,
          currentWidth: width,
        };
        // Prevent text selection and show cursor globally during drag
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      },
    [],
  );

  // ── Styles ───────────────────────────────────────────────────────────────

  const headerCellSx = {
    // Opaque — prevents row content bleeding through on scroll.
    backgroundColor: '#fafafa',
    borderBottom: '2px solid',
    borderColor: 'divider',
    py: 1.25,
    px: 2,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    position: 'sticky',
    // Sticky is scoped to the TableContainer scroll context (internal table body scroll).
    top: 0,
    zIndex: 3,
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
            // Use committed width (post-drag) for rendering
            const resolvedWidth = colWidths[col.field] ?? col.width;

            return (
              <TableCell
                key={col.field}
                sortDirection={direction}
                sx={{
                  ...headerCellSx,
                  ...(resolvedWidth ? { width: resolvedWidth, minWidth: resolvedWidth } : {}),
                  ...(col.flex && !resolvedWidth ? { flex: col.flex } : {}),
                  ...(col.cellSx || {}),
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

                {/* Resize handle — not shown on the actions (empty-header) column */}
                {col.headerName !== '' && (
                  <Box
                    onMouseDown={handleResizeMouseDown(col.field, resolvedWidth ?? 120)}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: 8,
                      cursor: 'col-resize',
                      zIndex: 1,
                      // Visible indicator on hover
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: '15%',
                        bottom: '15%',
                        right: 3,
                        width: 2,
                        borderRadius: '2px',
                        backgroundColor: 'divider',
                        opacity: 0,
                        transition: 'opacity 150ms',
                      },
                      '&:hover::after': {
                        opacity: 1,
                        backgroundColor: 'primary.main',
                      },
                    }}
                  />
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
