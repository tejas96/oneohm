import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionEntity, RoleEntity, RolePermissionEntity } from './entities';
import { UsersModule } from '../users/users.module';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { PermissionRepository, RolePermissionRepository, RoleRepository } from './repositories';
import { IamService } from './services/iam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionEntity, RoleEntity, RolePermissionEntity]),
    forwardRef(() => UsersModule),
  ],
  controllers: [RoleController, PermissionController, UserRoleController],
  providers: [
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,
    IamService,
    SuperAdminGuard,
  ],
  exports: [
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,
    IamService,
    SuperAdminGuard,
  ],
})
export class IamModule {}
