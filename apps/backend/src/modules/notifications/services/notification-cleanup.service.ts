import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

/**
 * Keeps the notifications table from growing forever. Morning summaries are
 * only useful for a day or two; everything else is kept for six months.
 * Safe on several machines at once — a second DELETE finds nothing.
 */
@Injectable()
export class NotificationCleanupService {
  private readonly logger = new Logger(NotificationCleanupService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron('0 2 * * *', { name: 'notifications:cleanup', timeZone: 'Asia/Kolkata' })
  async purgeOld(): Promise<void> {
    try {
      const [, deleted] = await this.dataSource.query<[unknown, number | undefined]>(
        `DELETE FROM notifications
          WHERE (type = ANY($1::text[]) AND created_at < now() - interval '30 days')
             OR created_at < now() - interval '180 days'`,
        [[NotificationType.DAILY_SUMMARY, NotificationType.ADMIN_DAILY_SUMMARY]],
      );
      this.logger.log(`Deleted ${deleted ?? 0} old notifications`);
    } catch (err) {
      this.logger.error('Notification cleanup failed', err);
    }
  }
}
