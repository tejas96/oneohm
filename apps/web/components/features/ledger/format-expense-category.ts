import { EXPENSE_CATEGORY_LABELS } from '@tejas96/shared';
import { ExpenseCategory } from '@tejas96/shared/types';

/** Known enum values get a label; custom "Other" categories pass through as typed. */
export function formatExpenseCategory(cat: string): string {
  return EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] ?? cat;
}
