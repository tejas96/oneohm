import type {
  ExpenseCategory,
  ExpensePaidByType,
  ReimbursementStatus,
} from '../enums/finance.enum';
import type { PaymentMethod } from '../enums/payment.enum';

/**
 * ExpenseProductLink — links a project expense line to either a catalog
 * product (BOM-itemized) or an off-list item (free-text). When `productId`
 * is set, the link participates in BOM procurement aggregation and inventory
 * transactions; when null, it is a pure expense itemization.
 */
export interface ExpenseProductLink {
  id: string;
  expenseId: string;

  /** Catalog product reference. Null for off-list items. */
  productId?: string | null;

  /** Required when `productId` is null. Snapshot of the off-list item name. */
  itemName?: string | null;

  /** Free-text unit (e.g. "tube", "box") for off-list items. */
  unit?: string | null;

  /** Quantity procured. Always > 0. */
  quantity: number;

  /** Optional per-unit price for itemized expenses. */
  unitPrice?: number | null;

  notes?: string | null;
}

/**
 * ProjectExpense — a single cash outflow recorded against a project.
 */
export interface ProjectExpense {
  id: string;
  organizationId: string;
  projectId: string;

  /** Sequential, FY-scoped (e.g. 'EXP-2026-27-000123'). */
  expenseNumber: string;

  category: ExpenseCategory;

  /** Free-text vendor name (vendor master is out of scope for v1). */
  vendorName?: string | null;

  amount: number;

  /** ISO 4217. Locked to 'INR' in v1. */
  currency: string;

  /** Date of expense. Must be <= today (server-validated). */
  expenseDate: string;

  paymentMethod: PaymentMethod;

  paidBy: ExpensePaidByType;

  /** Required when `paidBy = EMPLOYEE`. */
  paidByEmployeeId?: string | null;

  reimbursementStatus: ReimbursementStatus;
  reimbursedAt?: string | null;
  reimbursedBy?: string | null;

  /** True when the procurement guard was bypassed via override permission. */
  overrideUsed: boolean;
  overrideReason?: string | null;

  notes?: string | null;

  /** Populated when fetched with relations. */
  productLinks?: ExpenseProductLink[];

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

/**
 * Per-product procurement summary derived from `expense_product_links`
 * aggregated against the BOM. Returned by the BOM read endpoint to power
 * procurement badges. Survives BOM re-syncs because it keys on `productId`,
 * not on the volatile `bom_item_id`.
 */
export interface ProductProcurementStatus {
  productId: string;
  required: number;
  procured: number;
  status: 'pending' | 'partial' | 'procured' | 'over_procured';
}
