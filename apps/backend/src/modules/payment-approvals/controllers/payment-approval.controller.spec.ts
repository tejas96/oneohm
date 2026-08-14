import { describe, expect, it } from '@jest/globals';

import { PaymentApprovalController } from './payment-approval.controller';
import { JwtAuthGuard } from '../../auth/guards';

/**
 * JwtAuthGuard is applied per-controller in this codebase — only ThrottlerGuard
 * is global. Shipping without it left the entire approval queue, including every
 * customer's payment amounts and references, readable with no token at all.
 * This pins the guard so that cannot silently regress.
 */
describe('PaymentApprovalController', () => {
  it('is protected by JwtAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', PaymentApprovalController) as unknown[];
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });
});
