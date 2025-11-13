import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogController } from './controllers';
import { AuditLogEntity } from './entities';
import { AuditLogRepository } from './repositories';
import { AuditLogService } from './services';

/**
 * Audit & Logging Module
 * 
 * Provides comprehensive audit trail functionality for tracking
 * all entity changes across the system.
 * 
 * Features:
 * - Audit log creation and storage
 * - Complex querying with filters
 * - User activity tracking
 * - Entity change history
 * - Statistics and reporting
 * - Before/after value comparison
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditLogController],
  providers: [AuditLogRepository, AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}

