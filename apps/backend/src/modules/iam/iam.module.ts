import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FeatureEntity, PermissionEntity, RoleEntity, RolePermissionEntity } from './entities';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { FeatureController } from './controllers/feature.controller';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { FeatureGuard } from './guards/feature.guard';
import { PermissionGuard } from './guards/permission.guard';
import {
  FeatureRepository,
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
} from './repositories';
import { IamService } from './services/iam.service';

/**
 * IAM Module (Identity and Access Management)
 * Provides dynamic role-based access control (RBAC) and
 * attribute-based access control (ABAC) for the application
 *
 * Features:
 * - Dynamic roles per organization
 * - Granular permissions per feature
 * - Feature-level access control
 * - Organization-level feature licensing
 * - Scope-based permissions (all, own, department, etc.)
 * - Conditional access (ABAC)
 *
 * Replaces hardcoded Role enum with database-driven IAM system
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Core IAM entities (minimal - 4 tables)
      FeatureEntity,
      PermissionEntity,
      RoleEntity,
      RolePermissionEntity,
    ]),
    // Module dependencies
    OrganizationsModule,
    forwardRef(() => UsersModule), // ← Use forwardRef to break circular dependency
  ],
  controllers: [RoleController, PermissionController, FeatureController],
  providers: [
    // Repositories
    FeatureRepository,
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,

    // Services
    IamService,

    // Guards
    PermissionGuard,
    FeatureGuard,
  ],
  exports: [
    // Export repositories for other modules
    FeatureRepository,
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,

    // Export services
    IamService,

    // Export guards
    PermissionGuard,
    FeatureGuard,
  ],
})
export class IamModule {}
