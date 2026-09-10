'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Sub-Components
// ============================================================================

// ============================================================================
// Main Component
// ============================================================================

// ============================================================================
// Table Footer Pagination
// ============================================================================

export interface TablePaginationProps {
  /** Current active page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page size */
  pageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Total number of items */
  totalItems?: number;
  /** Item label for display (e.g., "properties", "customers") - used with 'simple' variant */
  itemLabel?: string;
  /** Pagination variant: 'full' (default) for complete controls, 'simple' for compact display */
  variant?: 'full' | 'simple';
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pagination designed for table footers
 *
 * Variants:
 * - 'simple': "Showing 1-5 of 5 properties" (matches UX reference)
 * - 'full': Full controls with page size selector and navigation
 */
export function TablePagination({
  currentPage,
  totalPages,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  totalItems = 0,
  itemLabel = 'items',
  variant = 'full',
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Calculate item range - handle edge cases
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Handle edge case: no items
  if (totalItems === 0) {
    return (
      <div className={cn('px-4 py-3 flex items-center justify-center', className)}>
        <p className="text-sm text-foreground-tertiary">No results to display</p>
      </div>
    );
  }

  // Simple variant: matches UX reference - "Showing 1-5 of 5 properties"
  if (variant === 'simple') {
    return (
      <div className={cn('px-4 py-3 flex items-center justify-between', className)}>
        {/* Item Range - Left side */}
        <span className="text-sm text-foreground-secondary">
          Showing {startItem}-{endItem} of {totalItems} {itemLabel}
        </span>

        {/* Navigation - Right side */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canGoPrev && onPageChange(currentPage - 1)}
            disabled={!canGoPrev}
            aria-label="Go to previous page"
            className={cn(
              'p-1.5 rounded transition-colors duration-fast',
              canGoPrev
                ? 'text-foreground-secondary hover:bg-muted hover:text-foreground cursor-pointer'
                : 'text-foreground-tertiary cursor-not-allowed opacity-50',
            )}
          >
            <ChevronLeft className="size-icon-sm" />
          </button>

          <span className="text-sm text-foreground-secondary whitespace-nowrap">
            Page <span className="font-medium text-foreground">{currentPage}</span>
            {' of '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>

          <button
            type="button"
            onClick={() => canGoNext && onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            aria-label="Go to next page"
            className={cn(
              'p-1.5 rounded transition-colors duration-fast',
              canGoNext
                ? 'text-foreground-secondary hover:bg-muted hover:text-foreground cursor-pointer'
                : 'text-foreground-tertiary cursor-not-allowed opacity-50',
            )}
          >
            <ChevronRight className="size-icon-sm" />
          </button>
        </div>
      </div>
    );
  }

  // Full variant: includes page size selector and full navigation
  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-border-light flex items-center justify-end gap-6',
        className,
      )}
    >
      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground-secondary whitespace-nowrap">Page Size:</span>
        {onPageSizeChange ? (
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger variant="borderless" className="h-8 w-16 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm font-medium text-foreground">{pageSize}</span>
        )}
      </div>

      {/* Item Range */}
      <p className="text-sm text-foreground-secondary whitespace-nowrap">
        <span className="font-medium text-foreground">{startItem}</span>
        {' to '}
        <span className="font-medium text-foreground">{endItem}</span>
        {' of '}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>

      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canGoPrev && onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          aria-label="Go to previous page"
          className={cn(
            'p-1.5 rounded transition-colors duration-fast',
            canGoPrev
              ? 'text-foreground-secondary hover:bg-muted hover:text-foreground cursor-pointer'
              : 'text-foreground-tertiary cursor-not-allowed opacity-50',
          )}
        >
          <ChevronLeft className="size-icon-sm" />
        </button>

        <span className="text-sm text-foreground-secondary whitespace-nowrap">
          Page <span className="font-medium text-foreground">{currentPage}</span>
          {' of '}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>

        <button
          type="button"
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Go to next page"
          className={cn(
            'p-1.5 rounded transition-colors duration-fast',
            canGoNext
              ? 'text-foreground-secondary hover:bg-muted hover:text-foreground cursor-pointer'
              : 'text-foreground-tertiary cursor-not-allowed opacity-50',
          )}
        >
          <ChevronRight className="size-icon-sm" />
        </button>
      </div>
    </div>
  );
}
