import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { StorageModule } from '../storage/storage.module';
import { LedgerController } from './controllers/ledger.controller';
import { LedgerAllocationEntity, LedgerEntryEntity, PaymentMilestoneEntity } from './entities';
import { PaymentApprovalModule } from '../payment-approvals/payment-approval.module';
import { LedgerRepository } from './repositories/ledger.repository';
import { CreditSweepService } from './services/credit-sweep.service';
import { LedgerWriteService } from './services/ledger-write.service';
import { MilestoneScheduleService } from './services/milestone-schedule.service';
import { MilestoneService } from './services/milestone.service';
import { ProjectLedgerService } from './services/project-ledger.service';
import { ReceiptDocumentService } from './services/receipt-document.service';

/**
 * LedgerModule — the single owner of money.
 *
 * Replaces `payments/`, `payment-terms/` and `project-expenses/`. Those three
 * stay mounted until the consumer and projects repoints land, because
 * `consumer.module.ts` and `projects.module.ts` both depend on them and removing
 * either first is a NestJS DI boot failure that takes down far more than
 * finance.
 *
 * Division of responsibility once the migration completes:
 *   `ledger/`  — writes and owns money, and all project-scoped money reads
 *   `finance/` — org-wide reporting, reading the two views
 *
 * `FinanceCommonModule` is imported for `SequenceService`, which generates
 * `RCP-{FY}-{6digit}` / `EXP-{FY}-{6digit}` numbers race-safely. Reusing it
 * rather than minting a new scheme keeps receipt numbering continuous across
 * the cutover, so every receipt already sent to a customer still matches.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerEntryEntity, LedgerAllocationEntity, PaymentMilestoneEntity]),
    FinanceCommonModule,
    // The ledger self-audits (append-only), but the milestone PLAN is mutable —
    // waivers and amount changes need a trail. AuditModule had zero callers
    // before this; it was registered in app.module.ts and used by nobody.
    AuditModule,
    // A recorded payment now produces a receipt PDF filed against the property.
    // The bytes are rendered in the browser (no server-side PDF library exists);
    // these two put them in storage and register the document row.
    StorageModule,
    DocumentsModule,
    // Recording money now queues it for approval instead of writing straight to
    // the ledger. Circular by nature: PaymentApprovalModule needs
    // LedgerWriteService to perform the write once an approver says yes.
    forwardRef(() => PaymentApprovalModule),
  ],
  controllers: [LedgerController],
  providers: [
    LedgerRepository,
    LedgerWriteService,
    CreditSweepService,
    ReceiptDocumentService,
    MilestoneService,
    MilestoneScheduleService,
    ProjectLedgerService,
  ],
  exports: [
    LedgerRepository,
    LedgerWriteService,
    CreditSweepService,
    ReceiptDocumentService,
    MilestoneService,
    MilestoneScheduleService,
    ProjectLedgerService,
  ],
})
export class LedgerModule {}
