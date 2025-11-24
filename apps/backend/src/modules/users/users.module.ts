import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from './controllers';
import { UserEntity, UserRoleEntity, EmployeeProfileEntity, InvitationEntity } from './entities';
import {
  UserRepository,
  UserRoleRepository,
  EmployeeProfileRepository,
  InvitationRepository,
} from './repositories';
import { UserService, ProfileService, InvitationService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { IamModule } from '../iam/iam.module';
import { ResellersModule } from '../resellers/resellers.module';

/**
 * Users Module
 * User management only (Auth moved to AuthModule)
 *
 * Features:
 * - User CRUD
 * - Profile management (Customer, Reseller, Employee)
 * - Invitations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRoleEntity, EmployeeProfileEntity, InvitationEntity]),
    forwardRef(() => IamModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => ResellersModule),
  ],
  controllers: [UserController],
  providers: [
    UserRepository,
    UserRoleRepository,
    EmployeeProfileRepository,
    InvitationRepository,
    UserService,
    ProfileService,
    InvitationService,
  ],
  exports: [
    UserService,
    ProfileService,
    InvitationService,
    UserRepository,
    UserRoleRepository,
    EmployeeProfileRepository,
    InvitationRepository,
  ],
})
export class UsersModule {}
