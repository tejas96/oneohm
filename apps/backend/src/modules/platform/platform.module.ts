import { Module } from '@nestjs/common';

/**
 * Platform Module
 * Reserved for future platform-level features
 *
 * Potential future features:
 * - Platform billing/subscription management
 * - Platform analytics dashboard
 * - Platform-wide settings
 * - Multi-tenant administration
 *
 * Note: Organization management has been moved to OrganizationsModule
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class PlatformModule {}
