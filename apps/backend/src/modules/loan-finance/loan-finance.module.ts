import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoanApplicationController, LoanDocumentController } from './controllers';
import { LoanApplicationEntity, LoanDocumentEntity } from './entities';
import { LoanApplicationRepository, LoanDocumentRepository } from './repositories';
import { LoanApplicationService, LoanDocumentService } from './services';

/**
 * Loan & Finance Module
 *
 * Simplified module for tracking customer loan interest with external banks.
 * We don't provide loans - customers get them from banks.
 *
 * Handles:
 * - Loan application tracking (customer interest in external bank loans)
 * - Bank reference number management (entered by finance team)
 * - Loan documents with verification tracking (KYC documents)
 * - Basic status tracking (initiated, applied, approved, rejected, cancelled)
 * - Sales team follow-up support
 */
@Module({
  imports: [TypeOrmModule.forFeature([LoanApplicationEntity, LoanDocumentEntity])],
  controllers: [LoanApplicationController, LoanDocumentController],
  providers: [
    LoanApplicationRepository,
    LoanDocumentRepository,
    LoanApplicationService,
    LoanDocumentService,
  ],
  exports: [LoanApplicationService, LoanDocumentService],
})
export class LoanFinanceModule {}
