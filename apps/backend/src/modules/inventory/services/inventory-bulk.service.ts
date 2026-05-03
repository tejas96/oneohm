import { Injectable } from '@nestjs/common';

import { runBulk, type BulkResult } from './helpers/bulk-runner';
import { MaterialDispatchService } from './material-dispatch.service';
import { PurchaseOrderService } from './purchase-order.service';
import { StockAllocationService } from './stock-allocation.service';

/**
 * Best-effort bulk operations for inventory resources.
 *
 * Design rules (per the inventory-rebuild plan, adversarial review):
 *   - Sequential per-id (NOT a single transaction across all ids) so a hard
 *     failure on one row does not roll back the rest.
 *   - Each id is wrapped in try/catch by runBulk; the response is the standard
 *     { succeeded: string[], failed: { id, reason }[] } shape.
 *   - Permissions are enforced at the controller layer with the SAME code as
 *     the corresponding single-record route (purchase-order:approve,
 *     purchase-order:cancel, allocation:cancel, dispatch:cancel) so users
 *     cannot escalate by going through bulk.
 *   - Org isolation is inherited from the underlying single-record services
 *     which already filter by organizationId on every read/write.
 */
@Injectable()
export class InventoryBulkService {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly stockAllocationService: StockAllocationService,
    private readonly materialDispatchService: MaterialDispatchService,
  ) {}

  approvePurchaseOrders(
    ids: string[],
    organizationId: string,
    userId: string,
  ): Promise<BulkResult> {
    return runBulk(
      ids,
      (id) => this.purchaseOrderService.approve(id, organizationId, userId),
      'PO.bulkApprove',
    );
  }

  cancelPurchaseOrders(
    ids: string[],
    organizationId: string,
    reason: string,
    userId: string,
  ): Promise<BulkResult> {
    return runBulk(
      ids,
      (id) => this.purchaseOrderService.cancel(id, organizationId, reason, userId),
      'PO.bulkCancel',
    );
  }

  cancelAllocations(
    ids: string[],
    organizationId: string,
    reason: string,
    userId: string,
  ): Promise<BulkResult> {
    return runBulk(
      ids,
      (id) => this.stockAllocationService.cancel(id, organizationId, reason, userId),
      'Allocation.bulkCancel',
    );
  }

  cancelDispatches(
    ids: string[],
    organizationId: string,
    reason: string,
    userId: string,
  ): Promise<BulkResult> {
    return runBulk(
      ids,
      (id) => this.materialDispatchService.cancel(id, organizationId, reason, userId),
      'Dispatch.bulkCancel',
    );
  }
}
