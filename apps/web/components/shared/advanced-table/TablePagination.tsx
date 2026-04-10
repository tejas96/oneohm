'use client';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import { type JSX, memo, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface AdvancedTablePaginationProps {
  page: number;
  pageSize: number;
  totalRowCount: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// ============================================================================
// Component
// ============================================================================

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function AdvancedTablePaginationInner({
  page,
  pageSize,
  totalRowCount,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = 'rows',
  onPageChange,
  onPageSizeChange,
}: AdvancedTablePaginationProps): JSX.Element {
  const totalPages = totalRowCount === 0 ? 1 : Math.ceil(totalRowCount / pageSize);

  // Trust the controlled `page` prop directly — do NOT clamp against totalPages.
  // Clamping caused a stale-display bug: while data is loading totalRowCount=0 → totalPages=1
  // → displayPage=0, so clicking next always appeared to stay on page 1.
  const displayPage = page;

  const start = totalRowCount === 0 ? 0 : displayPage * pageSize + 1;
  // Clamp end so last page never shows e.g. "91–100 of 95"
  const end = Math.min((displayPage + 1) * pageSize, totalRowCount);

  const canPrev = displayPage > 0;
  const canNext = totalRowCount > 0 && displayPage < totalPages - 1;

  const handlePrev = useCallback((): void => {
    if (canPrev) onPageChange(displayPage - 1);
  }, [canPrev, displayPage, onPageChange]);

  const handleNext = useCallback((): void => {
    if (canNext) onPageChange(displayPage + 1);
  }, [canNext, displayPage, onPageChange]);

  const handleRowsPerPageChange = useCallback(
    (e: SelectChangeEvent<number>): void => {
      onPageSizeChange(Number(e.target.value));
    },
    [onPageSizeChange],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 0.75,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {/* Left: item count label */}
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 160 }}>
        {totalRowCount === 0
          ? `No ${itemLabel}`
          : `Showing ${start}–${end} of ${totalRowCount} ${itemLabel}`}
      </Typography>

      {/* Right: rows-per-page + page navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Rows per page */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Rows:
          </Typography>
          <FormControl size="small" variant="outlined">
            <Select<number>
              value={pageSize}
              onChange={handleRowsPerPageChange}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              }}
            >
              {pageSizeOptions.map((opt) => (
                <MenuItem key={opt} value={opt} dense>
                  <Typography variant="caption">{opt}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Page navigation: < Page N of M > */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Previous page"
            sx={{ p: 0.5 }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 72, textAlign: 'center', whiteSpace: 'nowrap' }}
          >
            Page {displayPage + 1} of {totalPages}
          </Typography>

          <IconButton
            size="small"
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Next page"
            sx={{ p: 0.5 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export const AdvancedTablePagination = memo(AdvancedTablePaginationInner);
