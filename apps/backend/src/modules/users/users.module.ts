import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from './controllers';
import { InvitationController } from './controllers/invitation.controller';
import { UserEntity, UserRoleEntity, InvitationEntity } from './entities';
import { UserRepository, UserRoleRepository, InvitationRepository } from './repositories';
import { UserService, ProfileService, InvitationService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { EmployeesModule } from '../employees/employees.module';
import { IamModule } from '../iam/iam.module';
import { ResellersModule } from '../resellers/resellers.module';

/**
 * Users Module
 * User management and authentication
 *
 * Features:
 * - User CRUD
 * - Profile orchestration (delegates to Customers, Resellers, Employees modules)
 * - Invitations
 *
 * Profile modules:
 * - CustomersModule: Customer profile management
 * - ResellersModule: Reseller profile management
 * - EmployeesModule: Employee profile management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRoleEntity, InvitationEntity]),
    forwardRef(() => IamModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => ResellersModule),
    forwardRef(() => EmployeesModule),
  ],
  controllers: [UserController, InvitationController],
  providers: [
    UserRepository,
    UserRoleRepository,
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
    InvitationRepository,
  ],
})
export class UsersModule {}
