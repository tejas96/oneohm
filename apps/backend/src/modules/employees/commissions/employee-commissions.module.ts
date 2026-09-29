import { Module } from '@nestjs/common';

import { CommissionBirthModule } from './commission-birth.module';
import { EmployeeCommissionController } from './controllers/employee-commission.controller';
import { ResellerDashboardController } from './controllers/reseller-dashboard.controller';
import { CommissionActionsService } from './services/commission-actions.service';
import { ResellerDashboardService } from './services/reseller-dashboard.service';

/**
 * Employee Commissions Module
 * Manages commission records for employee_profiles (reseller-kind) rows.
 * Co-located inside the employees module rather than a separate top-level
 * module (replaces the old top-level ResellersModule's commission
 * registration).
 *
 * Reads and writes go through raw SQL against `employee_commissions`
 * (CommissionActionsService + COMMISSION_ROW_SQL), not a TypeORM repository,
 * and nothing here needs EmployeeService — so there is no forwardRef cycle
 * with EmployeesModule any more.
 */
@Module({
  imports: [CommissionBirthModule],
  controllers: [EmployeeCommissionController, ResellerDashboardController],
  providers: [CommissionActionsService, ResellerDashboardService],
  exports: [CommissionActionsService],
})
export class EmployeeCommissionsModule {}
