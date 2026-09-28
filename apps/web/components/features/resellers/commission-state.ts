import type { CommissionState } from '@tejas96/shared/utils';

import type { CrmTone } from '@/components/shared/crm-table';

export const COMMISSION_STATE_TONE: Record<CommissionState, CrmTone> = {
  pending: 'neutral',
  needs_amount: 'warning',
  on_hold: 'warning',
  waiting_for_project: 'info',
  approved: 'info',
  payment_in_review: 'info',
  paid: 'success',
  to_recover: 'danger',
  recovered: 'neutral',
  cancelled: 'neutral',
};
