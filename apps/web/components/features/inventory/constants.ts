// ============================================================================
// Status display maps
// ============================================================================

export const WAREHOUSE_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const WAREHOUSE_STATUS_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  active: 'success',
  inactive: 'default',
};

export const WAREHOUSE_TYPE_LABEL: Record<string, string> = {
  own: 'Own',
  third_party: 'Third Party',
};

export const PO_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  sent: 'Sent',
  confirmed: 'Confirmed',
  partially_received: 'Partially Received',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
};

export const PAYMENT_STATUS_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  pending: 'warning',
  partial: 'info',
  paid: 'success',
};

export const PO_STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> =
  {
    draft: 'default',
    submitted: 'warning',
    pending_approval: 'warning',
    approved: 'info',
    sent: 'info',
    confirmed: 'info',
    partially_received: 'warning',
    received: 'success',
    cancelled: 'error',
  };

export const VENDOR_TYPE_LABEL: Record<string, string> = {
  supplier: 'Supplier',
  contractor: 'Contractor',
  service_provider: 'Service provider',
};

export const VENDOR_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
};

export const VENDOR_STATUS_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  active: 'success',
  inactive: 'default',
  blacklisted: 'error',
};

export const PROJECT_VENDOR_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  terminated: 'Terminated',
};

export const PROJECT_VENDOR_STATUS_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  active: 'success',
  completed: 'info',
  terminated: 'error',
};

export const ALLOCATION_STATUS_LABEL: Record<string, string> = {
  allocated: 'Allocated',
  partially_dispatched: 'Partially Dispatched',
  dispatched: 'Dispatched',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ALLOCATION_STATUS_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  allocated: 'info',
  partially_dispatched: 'warning',
  dispatched: 'success',
  completed: 'success',
  cancelled: 'error',
};

export const DISPATCH_STATUS_LABEL: Record<string, string> = {
  prepared: 'Prepared',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  partially_delivered: 'Partially Delivered',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const DISPATCH_STATUS_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  prepared: 'default',
  dispatched: 'info',
  in_transit: 'warning',
  partially_delivered: 'warning',
  delivered: 'success',
  cancelled: 'error',
};

export const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  dispatch: 'Dispatch',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  adjustment: 'Adjustment',
  allocation: 'Allocation',
  return: 'Return',
};

export const TRANSACTION_TYPE_COLOR: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  purchase: 'success',
  sale: 'info',
  dispatch: 'error',
  transfer_in: 'info',
  transfer_out: 'warning',
  adjustment: 'default',
  allocation: 'warning',
  return: 'info',
};

// Reason codes for stock adjustment
export const ADJUSTMENT_REASONS = [
  { value: 'damaged', label: 'Damaged / Defective' },
  { value: 'expired', label: 'Expired' },
  { value: 'stocktake', label: 'Stock Take Correction' },
  { value: 'theft', label: 'Theft / Loss' },
  { value: 'other', label: 'Other' },
];
