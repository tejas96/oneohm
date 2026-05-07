import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectExpenseController } from './controllers/project-expense.controller';
import { ExpenseProductLinkEntity } from './entities/expense-product-link.entity';
import { ProjectExpenseEntity } from './entities/project-expense.entity';
import { ProjectExpenseRepository } from './repositories/project-expense.repository';
import { ProjectExpenseService } from './services/project-expense.service';
import { BomModule } from '../bom/bom.module';
import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { ProjectsModule } from '../projects/projects.module';

/**
 * ProjectExpensesModule
 *
 * Owns the cash-outflow ledger (plan §3.3). Depends on:
 *   - FinanceCommonModule for SequenceService (EXP-{FY}-{6digit})
 *   - ProjectsModule for ProjectRepository (multi-tenancy validation)
 *   - BomModule for getBomTargetsForProject (procurement guard)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectExpenseEntity, ExpenseProductLinkEntity]),
    FinanceCommonModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => BomModule),
  ],
  controllers: [ProjectExpenseController],
  providers: [ProjectExpenseRepository, ProjectExpenseService],
  exports: [ProjectExpenseRepository, ProjectExpenseService],
})
export class ProjectExpensesModule {}
