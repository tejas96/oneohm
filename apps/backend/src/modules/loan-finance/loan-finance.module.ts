import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoanApplicationController } from './controllers';
import { LoanApplicationEntity } from './entities';
import { LoanApplicationRepository } from './repositories';
import { LoanApplicationService } from './services';

/**
 * Loan & Finance Module
 *
 * Simplified module for tracking customer loan interest with external banks.
 * We don't provide loans - customers get them from banks.
 *
 * Handles:
 * - Loan application tracking (customer interest in external bank loans)
 * - Bank reference number management (entered by finance team)
 * - Basic status tracking (initiated, applied, approved, rejected, cancelled)
 * - Sales team follow-up support
 *
 * Note: Documents are now stored in CustomerPropertyEntity.documents JSONB.
 * Use property.documents.filter(d => d.isLoanDoc) to get loan documents.
 */
@Module({
  imports: [TypeOrmModule.forFeature([LoanApplicationEntity])],
  controllers: [LoanApplicationController],
  providers: [LoanApplicationRepository, LoanApplicationService],
  exports: [LoanApplicationService, LoanApplicationRepository],
})
export class LoanFinanceModule {}
