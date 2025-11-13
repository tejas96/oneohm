import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoanApplicationEntity, LoanDocumentEntity } from './entities';
import { LoanApplicationRepository, LoanDocumentRepository } from './repositories';
import { LoanApplicationService, LoanDocumentService } from './services';
import { LoanApplicationController, LoanDocumentController } from './controllers';

/**
 * Loan & Finance Module
 * 
 * Handles:
 * - Loan applications with auto-numbering (LA-{YEAR}-{NUMBER})
 * - Loan documents with verification tracking
 * - Jan Samarth portal integration
 * - Site visit scheduling and completion
 * - Approval and rejection workflows
 * - Disbursement tracking
 * - Loan lifecycle management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanApplicationEntity,
      LoanDocumentEntity,
    ]),
  ],
  controllers: [
    LoanApplicationController,
    LoanDocumentController,
  ],
  providers: [
    LoanApplicationRepository,
    LoanDocumentRepository,
    LoanApplicationService,
    LoanDocumentService,
  ],
  exports: [
    LoanApplicationService,
    LoanDocumentService,
  ],
})
export class LoanFinanceModule {}

