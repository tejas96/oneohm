/**
 * Navigation Counts Types
 * Types for dynamic badge counts in navigation
 */

/** CRM-related counts */
interface CrmCounts {
  /** Total active customers */
  totalCustomers: number;
  /** Total properties */
  totalProperties: number;
  /** Properties by lead temperature */
  properties: {
    hot: number;
    warm: number;
    cold: number;
  };
}

/** Quotes-related counts */
interface QuotesCounts {
  /** Total quotes */
  total: number;
  /** Draft quotes */
  drafts: number;
  /** Sent/pending approval quotes */
  sent: number;
  /** Approved quotes awaiting conversion */
  approved: number;
  /** Expiring soon (within 7 days) */
  expiringSoon: number;
}

/** Projects-related counts */
interface ProjectsCounts {
  /** Total projects */
  total: number;
  /** Active/in-progress projects */
  active: number;
  /** Projects awaiting approval/start */
  pending: number;
  /** Completed this month */
  completedThisMonth: number;
}

/** Inventory-related counts */
interface InventoryCounts {
  /** Total items */
  total: number;
  /** Items with low stock */
  lowStock: number;
  /** Items out of stock */
  outOfStock: number;
  /** Pending purchase orders */
  pendingPOs: number;
}

/** Finance-related counts */
interface FinanceCounts {
  /** Pending invoices */
  pendingInvoices: number;
  /** Overdue payments */
  overduePayments: number;
}

/** User task counts */
interface TaskCounts {
  /** Tasks due today */
  dueToday: number;
  /** Overdue tasks */
  overdue: number;
  /** Total pending tasks */
  pending: number;
}

/** Complete navigation counts object */
export interface NavigationCounts {
  crm: CrmCounts;
  quotes: QuotesCounts;
  projects: ProjectsCounts;
  inventory: InventoryCounts;
  finance: FinanceCounts;
  tasks: TaskCounts;
  /** Last updated timestamp */
  lastUpdated: Date | null;
}

/** State for the navigation counts hook */
export interface NavigationCountsState {
  counts: NavigationCounts;
  isLoading: boolean;
  error: string | null;
  /** Refetch counts from server */
  refetch: () => void;
}
