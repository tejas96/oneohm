import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from './controllers';
import { InvitationController } from './controllers/invitation.controller';
import { UserEntity, UserRoleEntity, InvitationEntity, UserDeviceTokenEntity } from './entities';
import {
  UserRepository,
  UserRoleRepository,
  InvitationRepository,
  UserDeviceTokenRepository,
} from './repositories';
import { UserService, ProfileService, InvitationService, DeviceTokenService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { EmployeesModule } from '../employees/employees.module';
import { IamModule } from '../iam/iam.module';

/**
 * Users Module
 * User management and authentication
 *
 * Features:
 * - User CRUD
 * - Profile orchestration (delegates to Customers, Employees modules)
 * - Invitations
 *
 * Profile modules:
 * - CustomersModule: Customer profile management
 * - EmployeesModule: Employee profile management (staff and reseller-kind
 *   rows, distinguished by profileKind)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRoleEntity, InvitationEntity, UserDeviceTokenEntity]),
    forwardRef(() => IamModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => EmployeesModule),
  ],
  controllers: [UserController, InvitationController],
  providers: [
    UserRepository,
    UserRoleRepository,
    InvitationRepository,
    UserDeviceTokenRepository,
    UserService,
    ProfileService,
    InvitationService,
    DeviceTokenService,
  ],
  exports: [
    UserService,
    ProfileService,
    InvitationService,
    DeviceTokenService,
    UserRepository,
    UserRoleRepository,
    InvitationRepository,
    UserDeviceTokenRepository,
  ],
})
export class UsersModule {}
