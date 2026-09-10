'use client';

import {
  ReimbursementStatus,
  type ExpenseCategory,
  type ExpensePaidByType,
} from '@tejas96/shared/types';

// ============================================================================
// Types — mirror backend ExpenseResponseDto.
// ============================================================================

interface ExpenseListFilters {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  vendorSearch?: string;
  paidBy?: ExpensePaidByType;
  reimbursementStatus?: ReimbursementStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// Cache keys
// ============================================================================

const projectExpenseKeys = {
  all: () => ['project-expenses'] as const,
  byProject: (projectId: string) => [...projectExpenseKeys.all(), 'project', projectId] as const,
  list: (projectId: string, filters: ExpenseListFilters) =>
    [...projectExpenseKeys.byProject(projectId), 'list', filters] as const,
  summary: (projectId: string) => [...projectExpenseKeys.byProject(projectId), 'summary'] as const,
};

// ============================================================================
// Reads
// ============================================================================

// ============================================================================
// Mutations
// ============================================================================
