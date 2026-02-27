import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionEntity, RoleEntity, RolePermissionEntity } from './entities';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { PermissionGuard } from './guards/permission.guard';
import { RoleGuard } from './guards/role.guard';
import {
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
} from './repositories';
import { IamService } from './services/iam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionEntity, RoleEntity, RolePermissionEntity]),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [RoleController, PermissionController, UserRoleController],
  providers: [
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,
    IamService,
    PermissionGuard,
    RoleGuard,
  ],
  exports: [
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,
    IamService,
    PermissionGuard,
    RoleGuard,
  ],
})
export class IamModule {}
