'use client';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, IconButton, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { type JSX, memo, useCallback } from 'react';

import { color, crm, radius } from '@/lib/theme/tokens';

interface CrmTablePaginationProps {
  page: number;
  pageSize: number;
  totalRowCount: number;
  pageSizeOptions: number[];
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const labelSx = {
  fontSize: crm['text-row-sm'],
  color: color['text-tertiary'],
  whiteSpace: 'nowrap',
} as const;

/**
 * The CRM pager: `Showing 1–8 of 24 customers` on the left, rows-per-page and
 * `Page 1 of 3` on the right, on the `surface-alt` band that closes the card.
 *
 * The displayed page is the controlled prop as-is, never clamped against
 * `totalPages`. Clamping looks safer but breaks the loading window: while a page
 * change is in flight `totalRowCount` is 0, so a clamp would snap the label back
 * to page 1 and make "next" appear to do nothing.
 */
function CrmTablePaginationInner({
  page,
  pageSize,
  totalRowCount,
  pageSizeOptions,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: CrmTablePaginationProps): JSX.Element {
  const totalPages = totalRowCount === 0 ? 1 : Math.ceil(totalRowCount / pageSize);
  const start = totalRowCount === 0 ? 0 : page * pageSize + 1;
  // Clamped so the last page never reads "91–100 of 95".
  const end = Math.min((page + 1) * pageSize, totalRowCount);

  const canPrev = page > 0;
  const canNext = totalRowCount > 0 && page < totalPages - 1;

  const handlePrev = useCallback((): void => {
    if (canPrev) onPageChange(page - 1);
  }, [canPrev, page, onPageChange]);

  const handleNext = useCallback((): void => {
    if (canNext) onPageChange(page + 1);
  }, [canNext, page, onPageChange]);

  const handlePageSize = useCallback(
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
        gap: 1.25,
        px: crm['row-gutter'],
        py: crm['footer-pad-y'],
        flexShrink: 0,
        flexWrap: 'wrap',
        backgroundColor: color['surface-alt'],
      }}
    >
      <Box component="span" sx={labelSx}>
        {totalRowCount === 0
          ? `No ${itemLabel}`
          : `Showing ${start}–${end} of ${totalRowCount} ${itemLabel}`}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={labelSx}>
            Rows
          </Box>
          <Select<number>
            size="small"
            value={pageSize}
            onChange={handlePageSize}
            variant="standard"
            disableUnderline
            aria-label="Rows per page"
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: crm['text-row-sm'],
              color: color['text-secondary'],
              '& .MuiSelect-select': {
                py: 0,
                pl: 0.5,
                borderRadius: radius['rf-xs'],
                '&:focus': { backgroundColor: 'transparent' },
              },
            }}
          >
            {pageSizeOptions.map((opt) => (
              <MenuItem key={opt} value={opt} dense>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Previous page"
            sx={{
              width: crm['footer-button-size'],
              height: crm['footer-button-size'],
              color: color['text-secondary'],
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <Box
            component="span"
            sx={{
              fontSize: crm['text-row-sm'],
              color: color['text-secondary'],
              minWidth: crm['footer-page-min-width'],
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            Page {page + 1} of {totalPages}
          </Box>

          <IconButton
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Next page"
            sx={{
              width: crm['footer-button-size'],
              height: crm['footer-button-size'],
              color: color['text-secondary'],
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export const CrmTablePagination = memo(CrmTablePaginationInner);
