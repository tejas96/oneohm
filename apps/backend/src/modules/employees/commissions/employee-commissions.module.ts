import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeesModule } from '../employees.module';
import { EmployeeCommissionController } from './controllers/employee-commission.controller';
import { EmployeeCommissionEntity } from './entities/employee-commission.entity';
import { EmployeeCommissionRepository } from './repositories/employee-commission.repository';
import { EmployeeCommissionService } from './services/employee-commission.service';

/**
 * Employee Commissions Module
 * Manages commission records for employee_profiles (reseller-kind) rows.
 * Co-located inside the employees module rather than a separate top-level
 * module, since it depends on EmployeeService from EmployeesModule (replaces
 * the old top-level ResellersModule's commission registration).
 *
 * forwardRef is used because EmployeesModule imports this module back to
 * register its controller/providers (mirrors the forwardRef pattern already
 * used between UsersModule and the other profile modules in this codebase).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeCommissionEntity]),
    forwardRef(() => EmployeesModule),
  ],
  controllers: [EmployeeCommissionController],
  providers: [EmployeeCommissionService, EmployeeCommissionRepository],
  exports: [EmployeeCommissionService, EmployeeCommissionRepository],
})
export class EmployeeCommissionsModule {}
