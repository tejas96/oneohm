import { Module, forwardRef } from '@nestjs/common';

import { PlatformOrganizationController, PublicOrganizationController } from './controllers';
import { PlatformOrganizationService } from './services';
import { IamModule } from '../iam/iam.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

/**
 * Platform Module
 * Platform admin functionality for managing organizations
 *
 * Features:
 * - Create organizations with auto role seeding
 * - Manage super admins
 * - Organization CRUD operations
 * - User invitations
 * - Public organization search (no auth required)
 *
 * Access:
 * - Platform APIs: Restricted to platform_admin role only
 * - Public APIs: Open access for customer registration
 */
@Module({
  imports: [
    forwardRef(() => OrganizationsModule),
    forwardRef(() => IamModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [PlatformOrganizationController, PublicOrganizationController],
  providers: [PlatformOrganizationService],
  exports: [PlatformOrganizationService],
})
export class PlatformModule {}
