import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type TaskRuleSyncResult } from '@tejas96/shared/types';

import { SITE_EVENTS, SiteLoanChangedEvent } from '../events/site-loan-changed.event';
import { LoanTaskSyncService } from '../services/loan-task-sync.service';

@Injectable()
export class SiteLoanChangedListener {
  constructor(private readonly loanTaskSyncService: LoanTaskSyncService) {}

  /**
   * Not `async: true`, and `suppressErrors: false` (the library default is true):
   * the property save awaits this through `emitAsync` inside its transaction and
   * must fail when the sync fails.
   */
  @OnEvent(SITE_EVENTS.LOAN_CHANGED, { suppressErrors: false })
  handle(event: SiteLoanChangedEvent): Promise<TaskRuleSyncResult | null> {
    return this.loanTaskSyncService.syncForLoanChange(event);
  }
}
