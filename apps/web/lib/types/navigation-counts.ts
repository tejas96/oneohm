/**
 * Navigation Counts Types
 * Types for dynamic badge counts in navigation
 */

/** CRM-related counts */
export interface CrmCounts {
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
export interface QuotesCounts {
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
export interface ProjectsCounts {
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
export interface InventoryCounts {
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
export interface FinanceCounts {
  /** Pending invoices */
  pendingInvoices: number;
  /** Overdue payments */
  overduePayments: number;
}

/** User task counts */
export interface TaskCounts {
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

/** Default/empty counts */
export const DEFAULT_NAVIGATION_COUNTS: NavigationCounts = {
  crm: {
    totalCustomers: 0,
    totalProperties: 0,
    properties: { hot: 0, warm: 0, cold: 0 },
  },
  quotes: {
    total: 0,
    drafts: 0,
    sent: 0,
    approved: 0,
    expiringSoon: 0,
  },
  projects: {
    total: 0,
    active: 0,
    pending: 0,
    completedThisMonth: 0,
  },
  inventory: {
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    pendingPOs: 0,
  },
  finance: {
    pendingInvoices: 0,
    overduePayments: 0,
  },
  tasks: {
    dueToday: 0,
    overdue: 0,
    pending: 0,
  },
  lastUpdated: null,
};
