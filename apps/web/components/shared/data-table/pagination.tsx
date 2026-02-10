'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
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

export interface PaginationProps {
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
  /** Pagination style variant */
  variant?: 'simple' | 'numbered' | 'bordered' | 'compact';
  /** Show page size selector */
  showPageSize?: boolean;
  /** Show item count text */
  showItemCount?: boolean;
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate page numbers with ellipsis for large page counts
 */
function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    // Always show last page
    pages.push(totalPages);
  }

  return pages;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface PageButtonProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
  variant: 'numbered' | 'bordered';
}

const PageButton = ({ page, isActive, onClick, variant }: PageButtonProps) => {
  const baseClasses =
    'flex items-center justify-center text-sm font-medium transition-colors duration-fast cursor-pointer';

  const variantClasses = {
    numbered: cn(
      'size-pagination-btn rounded-lg',
      isActive
        ? 'bg-primary text-white'
        : 'text-foreground-secondary hover:bg-muted'
    ),
    bordered: cn(
      'px-4 py-2 border-r border-border-light',
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-foreground-secondary hover:bg-muted'
    ),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(baseClasses, variantClasses[variant])}
      aria-current={isActive ? 'page' : undefined}
    >
      {page}
    </button>
  );
};

interface NavButtonProps {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
  variant: PaginationProps['variant'];
  showLabel?: boolean;
}

const NavButton = ({
  direction,
  disabled,
  onClick,
  variant,
  showLabel = false,
}: NavButtonProps) => {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const label = direction === 'prev' ? 'Previous' : 'Next';

  const baseClasses =
    'flex items-center gap-2 transition-colors duration-fast';

  const variantClasses = {
    simple: 'px-4 py-2 text-sm font-medium rounded-lg',
    numbered: 'size-pagination-btn justify-center rounded-lg',
    bordered: 'px-3 py-2',
    compact: 'p-2 rounded-lg',
  };

  const stateClasses = disabled
    ? 'text-foreground-tertiary cursor-not-allowed'
    : 'text-foreground-secondary hover:text-foreground hover:bg-muted cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, variantClasses[variant || 'numbered'], stateClasses)}
      aria-disabled={disabled}
      aria-label={label}
    >
      {direction === 'prev' && <Icon className="size-icon-sm" aria-hidden="true" />}
      {showLabel && <span>{label}</span>}
      {direction === 'next' && <Icon className="size-icon-sm" aria-hidden="true" />}
    </button>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function Pagination({
  currentPage,
  totalPages,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  totalItems,
  variant = 'numbered',
  showPageSize = false,
  showItemCount = false,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrev) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  // Calculate item range for display
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Simple variant: Previous / Page X of Y / Next
  if (variant === 'simple') {
    return (
      <nav
        aria-label="Pagination"
        className={cn('flex items-center justify-between', className)}
      >
        <NavButton
          direction="prev"
          disabled={!canGoPrev}
          onClick={handlePrevious}
          variant="simple"
          showLabel
        />
        <span className="text-sm text-foreground-secondary">
          Page {currentPage} of {totalPages}
        </span>
        <NavButton
          direction="next"
          disabled={!canGoNext}
          onClick={handleNext}
          variant="simple"
          showLabel
        />
      </nav>
    );
  }

  // Compact variant: < 1/10 >
  if (variant === 'compact') {
    return (
      <nav
        aria-label="Pagination"
        className={cn('flex items-center justify-center gap-4', className)}
      >
        <NavButton
          direction="prev"
          disabled={!canGoPrev}
          onClick={handlePrevious}
          variant="compact"
        />
        <span className="text-sm text-foreground">
          <span className="font-medium">{currentPage}</span>
          <span className="text-foreground-tertiary mx-1">/</span>
          <span>{totalPages}</span>
        </span>
        <NavButton
          direction="next"
          disabled={!canGoNext}
          onClick={handleNext}
          variant="compact"
        />
      </nav>
    );
  }

  // Bordered variant: Connected buttons with border
  if (variant === 'bordered') {
    const pages = getPageNumbers(currentPage, totalPages);

    return (
      <nav aria-label="Pagination" className={cn('flex items-center justify-center', className)}>
        <div className="inline-flex rounded-lg border border-border-light overflow-hidden">
          <NavButton
            direction="prev"
            disabled={!canGoPrev}
            onClick={handlePrevious}
            variant="bordered"
          />
          {pages.map((page, index) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-4 py-2 border-r border-border-light text-foreground-tertiary"
              >
                <MoreHorizontal className="size-icon-sm" aria-hidden="true" />
              </span>
            ) : (
              <PageButton
                key={page}
                page={page}
                isActive={page === currentPage}
                onClick={() => onPageChange(page)}
                variant="bordered"
              />
            )
          )}
          <NavButton
            direction="next"
            disabled={!canGoNext}
            onClick={handleNext}
            variant="bordered"
          />
        </div>
      </nav>
    );
  }

  // Default: Numbered variant with optional page size and item count
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex items-center',
        showPageSize || showItemCount ? 'justify-between' : 'justify-center',
        className
      )}
    >
      {/* Page size selector */}
      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-secondary">Show</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-9 w-select-compact">
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
          <span className="text-sm text-foreground-secondary">entries</span>
        </div>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        <NavButton
          direction="prev"
          disabled={!canGoPrev}
          onClick={handlePrevious}
          variant="numbered"
        />
        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="size-pagination-btn flex items-center justify-center text-foreground-tertiary"
            >
              <MoreHorizontal className="size-icon-sm" aria-hidden="true" />
            </span>
          ) : (
            <PageButton
              key={page}
              page={page}
              isActive={page === currentPage}
              onClick={() => onPageChange(page)}
              variant="numbered"
            />
          )
        )}
        <NavButton
          direction="next"
          disabled={!canGoNext}
          onClick={handleNext}
          variant="numbered"
        />
      </div>

      {/* Item count */}
      {showItemCount && totalItems !== undefined && (
        <p className="text-sm text-foreground-secondary">
          Showing{' '}
          <span className="font-medium text-foreground">{startItem}</span> to{' '}
          <span className="font-medium text-foreground">{endItem}</span> of{' '}
          <span className="font-medium text-foreground">{totalItems}</span>{' '}
          results
        </p>
      )}
    </nav>
  );
}

// ============================================================================
// Table Footer Pagination
// ============================================================================

export interface TablePaginationProps extends PaginationProps {
  /** Background style for table footer */
  variant?: 'simple' | 'numbered';
}

/**
 * Pagination designed for table footers
 * Reference: apps/ux/web/v2/components/pagination.html - Table Footer Style
 */
export function TablePagination({
  currentPage,
  totalPages,
  pageSize = 10,
  totalItems,
  onPageChange,
  className,
}: TablePaginationProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div
      className={cn(
        'px-6 py-4 bg-background-secondary border-t border-border-light flex items-center justify-between',
        className
      )}
    >
      <p className="text-sm text-foreground-secondary">
        Showing{' '}
        <span className="font-medium text-foreground">{startItem}</span> to{' '}
        <span className="font-medium text-foreground">{endItem}</span> of{' '}
        <span className="font-medium text-foreground">{totalItems}</span>{' '}
        results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canGoPrev && onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          aria-label="Go to previous page"
          aria-disabled={!canGoPrev}
          className={cn(
            'px-3 py-1.5 text-sm font-medium border border-border-light rounded-lg transition-colors duration-fast',
            canGoPrev
              ? 'text-foreground-secondary hover:bg-muted cursor-pointer'
              : 'text-foreground-tertiary cursor-not-allowed'
          )}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Go to next page"
          aria-disabled={!canGoNext}
          className={cn(
            'px-3 py-1.5 text-sm font-medium border border-border-light rounded-lg transition-colors duration-fast',
            canGoNext
              ? 'text-foreground-secondary hover:bg-muted cursor-pointer'
              : 'text-foreground-tertiary cursor-not-allowed'
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}
