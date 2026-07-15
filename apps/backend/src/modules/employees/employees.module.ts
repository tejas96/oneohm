import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { EmployeeCommissionsModule } from './commissions/employee-commissions.module';
import { EmployeeController } from './controllers/employee.controller';
import { EmployeeProfileEntity } from './entities/employee-profile.entity';
import { EmployeeProfileRepository } from './repositories/employee-profile.repository';
import { EmployeeService } from './services/employee.service';

/**
 * Employees Module
 * Manages employee profile entities and operations (both staff and
 * reseller-kind rows, distinguished by `profileKind` — see
 * EmployeeProfileKind). Also wires in the co-located commissions submodule
 * (formerly the standalone resellers module + its commissions).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeProfileEntity]),
    forwardRef(() => UsersModule),
    forwardRef(() => EmployeeCommissionsModule),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeProfileRepository],
  exports: [EmployeeService, EmployeeProfileRepository],
})
export class EmployeesModule {}
