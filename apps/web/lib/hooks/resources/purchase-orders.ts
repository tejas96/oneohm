'use client';

import {
  createResourceKeys,
  defineResource,
  useResourceDetail,
  useResourceList,
  useResourceMutations,
  useResourceStats,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

// ============================================================================
// Types
// ============================================================================

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  paymentStatus: string;
  poType?: string;
  vendorId: string;
  warehouseId?: string;
  projectId?: string;
  poDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  /** Total payments recorded against this PO (Part 2). */
  paidAmount: number;
  /** Computed = totalAmount - paidAmount; sent by the backend response DTO. */
  outstandingAmount?: number;
  vendor?: { id: string; name: string; code?: string };
  warehouse?: { id: string; name: string; code?: string };
  project?: { id: string; name?: string; projectNumber?: string };
  termsConditions?: string;
  items?: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  taxRate?: number;
  lineTotal: number;
  notes?: string;
  product?: { id: string; name: string; code: string };
}

export interface PurchaseOrderFilters extends BaseFilters {
  status?: string;
  paymentStatus?: string;
  vendorId?: string;
  warehouseId?: string;
  projectId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ReceivePOPayload {
  items: Array<{ itemId: string; quantityReceived: number }>;
  receivingDate?: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<PurchaseOrder>(
  'purchase-orders',
  {
    endpoint: '/purchase-orders',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
  },
  {
    view: 'inventory:read',
    create: 'purchase-order:write',
    update: 'purchase-order:write',
    delete: 'purchase-order:write',
  },
);

// ============================================================================
// Query keys
// ============================================================================

export const purchaseOrderKeys = createResourceKeys('purchase-orders');

// ============================================================================
// Hooks
// ============================================================================

export function usePurchaseOrders(
  overrides?: Partial<ResourceConfig<PurchaseOrder, PurchaseOrderFilters>>,
) {
  return useResourceList<PurchaseOrder, PurchaseOrderFilters>({
    resource: 'purchase-orders',
    endpoint: '/purchase-orders',
    defaultPageSize: 20,
    syncToUrl: true,
    ...overrides,
  });
}

export function usePurchaseOrder(id: string) {
  return useResourceDetail<PurchaseOrder>({
    resource: 'purchase-orders',
    endpoint: '/purchase-orders',
    id,
  });
}

export function usePurchaseOrderMutations() {
  return useResourceMutations<PurchaseOrder>({
    resource: 'purchase-orders',
    endpoint: '/purchase-orders',
    invalidateRelated: ['inventory-stock', 'inventory-transactions'] as const,
    customActions: {
      submit: {
        method: 'POST',
        path: (id) => `/purchase-orders/${id}/submit`,
      },
      approve: {
        method: 'POST',
        path: (id) => `/purchase-orders/${id}/approve`,
      },
      send: {
        method: 'POST',
        path: (id) => `/purchase-orders/${id}/send`,
      },
      receive: {
        method: 'POST',
        path: (id) => `/purchase-orders/${id}/receive`,
      },
      cancel: {
        method: 'POST',
        path: (id) => `/purchase-orders/${id}/cancel`,
      },
      recordPayment: {
        method: 'POST',
        path: (id) => `/purchase-orders/${id}/record-payment`,
      },
    },
    toast: {
      create: { success: 'Purchase order created', error: 'Failed to create purchase order' },
      update: { success: 'Purchase order updated', error: 'Failed to update purchase order' },
      delete: { success: 'Purchase order deleted', error: 'Failed to delete purchase order' },
      submit: { success: 'PO submitted for approval', error: 'Failed to submit PO' },
      approve: { success: 'PO approved', error: 'Failed to approve PO' },
      send: { success: 'PO sent to vendor', error: 'Failed to send PO' },
      receive: { success: 'Items received', error: 'Failed to receive items' },
      cancel: { success: 'PO cancelled', error: 'Failed to cancel PO' },
      recordPayment: { success: 'Payment recorded', error: 'Failed to record payment' },
    },
  });
}

// ============================================================================
// Payment-recorded payload — typed wrapper around the customAction.
// ============================================================================

export interface RecordPaymentPayload {
  /** Currency-decimal amount; backend validates 0 < amount <= outstanding. */
  amount: number;
  /** Optional free-text note attached to the audit trail. */
  notes?: string;
}

export function usePurchaseOrderStats() {
  return useResourceStats({
    resource: 'purchase-orders',
    endpoint: '/purchase-orders/stats/summary',
  });
}
