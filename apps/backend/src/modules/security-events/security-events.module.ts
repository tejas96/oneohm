import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecurityEventEntity } from './entities';
import { SecurityEventRepository } from './repositories';
import { SecurityEventService } from './services';

/**
 * Security Events Module
 * Provides centralized security event logging and auditing
 * 
 * Features:
 * - Generic security event tracking
 * - OTP attempt logging
 * - Rate limiting support
 * - Failed login tracking
 * - Suspicious activity detection
 * - Compliance audit trail
 * 
 * Exported for use in:
 * - Authentication module (OTP, login attempts)
 * - IAM module (permission denied events)
 * - All modules requiring security auditing
 */
@Module({
  imports: [TypeOrmModule.forFeature([SecurityEventEntity])],
  providers: [SecurityEventRepository, SecurityEventService],
  exports: [SecurityEventService, SecurityEventRepository],
})
export class SecurityEventsModule {}

