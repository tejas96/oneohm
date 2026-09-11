import { type PropertyType } from '@tejas96/shared/types';
import { type EntityManager } from 'typeorm';

/**
 * Raised by CustomerPropertyService.update, inside its transaction, when a save
 * changes `wants_loan`. The customers module cannot import the projects module,
 * so the loan sync listens for this instead of being called.
 *
 * Emit with `emitAsync` and await it: `manager` is the save's transaction, the
 * sync runs in it, and a failed sync rolls the whole save back.
 */
export const SITE_EVENTS = {
  LOAN_CHANGED: 'site.loan-changed',
} as const;

export class SiteLoanChangedEvent {
  constructor(
    public readonly propertyId: string,
    public readonly wantsLoanBefore: boolean,
    public readonly wantsLoanAfter: boolean,
    /** The type before the save, so a type change in the same save changes no task. */
    public readonly propertyTypeBefore: PropertyType,
    public readonly actorUserId: string | null,
    public readonly manager: EntityManager,
  ) {}
}
