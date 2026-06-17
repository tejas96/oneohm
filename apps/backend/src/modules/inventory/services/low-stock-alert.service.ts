import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationSeverity, NotificationType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { ADMIN_BYPASS_ROLES } from '../../iam/constants';
import { NotificationService } from '../../notifications/services/notification.service';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';

@Injectable()
export class LowStockAlertService {
  private readonly logger = new Logger(LowStockAlertService.name);

  private static readonly RECIPIENT_ROLE_CODES: string[] = [
    ...ADMIN_BYPASS_ROLES,
    'inventory_manager',
    'store',
    'project_manager',
    'accounts_manager',
  ];

  constructor(
    private readonly notificationService: NotificationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  checkAndFire(
    organizationId: string,
    stock: InventoryStockEntity,
    prevAvailable: number,
    newAvailable: number,
    performedBy: string,
  ): void {
    const minLevel = Number(stock.minimumStockLevel ?? 0);
    if (prevAvailable > minLevel && newAvailable <= minLevel) {
      const updatedStock = { ...stock, availableQuantity: newAvailable } as InventoryStockEntity;
      void this.fireNotification(organizationId, updatedStock, performedBy).catch((err) =>
        this.logger.error('Low-stock notification failed', err),
      );
    }
  }

  private async fireNotification(
    organizationId: string,
    stock: InventoryStockEntity,
    triggeredByUserId: string,
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const dedupeKey = `low-stock:${stock.warehouseId}:${stock.productId}:${today}`;

    const productName = stock.product?.name ?? stock.productId;
    const warehouseName = stock.warehouse?.name ?? stock.warehouseId;

    const recipientUserIds = await this.getRecipientUserIds(organizationId, triggeredByUserId);

    await Promise.all(
      recipientUserIds.map((userId) =>
        this.notificationService.create({
          organizationId,
          userId,
          type: NotificationType.LOW_STOCK,
          title: `Low Stock Alert: ${productName}`,
          body: `Stock for ${productName} at ${warehouseName} has dropped to ${stock.availableQuantity} (below minimum ${stock.minimumStockLevel}).`,
          severity: NotificationSeverity.WARNING,
          link: `/inventory/stock/${stock.id}`,
          metadata: {
            stockId: stock.id,
            productId: stock.productId,
            warehouseId: stock.warehouseId,
            availableQuantity: stock.availableQuantity,
            minimumStockLevel: stock.minimumStockLevel,
          },
          dedupeKey,
        }),
      ),
    );
  }

  private async getRecipientUserIds(
    organizationId: string,
    fallbackUserId: string,
  ): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT ur.user_id AS "userId"
       FROM user_roles ur
       INNER JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL
       LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE (ur.organization_id = $1 OR ur.organization_id IS NULL)
         AND COALESCE(r.code, ur.role) = ANY($2::text[])`,
      [organizationId, LowStockAlertService.RECIPIENT_ROLE_CODES],
    );

    const recipients = rows
      .map((row: { userId?: string }) => row.userId)
      .filter((userId: string | undefined): userId is string => Boolean(userId));

    if (!recipients.includes(fallbackUserId)) {
      recipients.push(fallbackUserId);
    }

    return recipients;
  }
}
