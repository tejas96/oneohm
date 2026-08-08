import type { PaymentTermSource, PaymentTermStatus } from '../enums/finance.enum';

/**
 * PaymentTerm — planned receivable installment for a project.
 * Snapshotted from `quote_versions.payment_milestones` at project creation;
 * project becomes the source of truth thereafter.
 */
export interface PaymentTerm {
  id: string;
  projectId: string;

  /** Audit reference to the source quote version (nullable on quote delete). */
  sourceQuoteVersionId?: string | null;

  /** How this term was created. */
  source: PaymentTermSource;

  /** Free-form stage identifier (e.g. 'advance', 'commissioning'). */
  stage: string;

  /** Display name shown in UI / printed on receipts. */
  name: string;

  description?: string | null;

  /** 1-based ordering within the project's term list. */
  displayOrder: number;

  /** Planned amount; must be > 0. */
  expectedAmount: number;

  /** Informational percentage of contract value (post-snapshot, never recomputed). */
  expectedPercentage?: number | null;

  /** ISO 4217 currency code. Locked to 'INR' in v1. */
  currency: string;

  /** Optional due date (date-only, no time). */
  dueDate?: string | null;

  status: PaymentTermStatus;

  /** Maintained by service via aggregation of linked receipts. Never user-edited. */
  paidAmount: number;

  /** Set when status transitions to PAID; cleared when it drops back. */
  completedAt?: string | null;

  /** Required when status = WAIVED. */
  waivedReason?: string | null;

  notes?: string | null;

  /** Optimistic concurrency token (TypeORM @VersionColumn). */
  version: number;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}
