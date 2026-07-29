import { describe, expect, it } from '@jest/globals';
import { PaymentTermStatus } from '@tejas96/shared/types';

import { ConsumerFinancialSummaryResponseDto } from './consumer-financial-summary.dto';
import {
  ConsumerPaymentDto,
  ConsumerPaymentTermDto,
  ConsumerProjectPaymentsResponseDto,
} from './consumer-payment-term.dto';
import { toDto } from '../../../common/utils';

/**
 * FROZEN WIRE CONTRACT — do not relax these assertions.
 *
 * `GET /consumer/projects/:id/payments` and `.../financial-summary` are consumed
 * by the installed consumer mobile app. Two properties make this brittle in ways
 * that are invisible from the backend:
 *
 *  1. `map-consumer-payments.ts` switches on the raw lowercase `status` string
 *     and falls through to `default: 'LOCKED'`. An unrecognised value renders a
 *     fully-paid milestone as a greyed-out locked card — no error, no telemetry.
 *  2. `useHomeDashboard.ts:95` ORs all error states, so a single failing field
 *     blanks the entire Home screen rather than just the payment card.
 *
 * These tests are written against the CURRENT implementation and must stay green
 * through the whole ledger rebuild. If one fails, the mobile app is about to
 * break — fix the code, not the test.
 *
 * Force-upgrade IS available (`app-config.service.ts:46,49`), so a shape change
 * is possible in principle — but only as a deliberate, coordinated app release,
 * never as a side effect of a backend refactor.
 */

const FINANCIAL_SUMMARY_KEYS = [
  'contractValue',
  'endDate',
  'netCost',
  'pending',
  'receiptCount',
  'startDate',
  'subsidyAmount',
  'totalExpected',
  'totalReceived',
] as const;

const PAYMENT_TERM_KEYS = [
  'displayOrder',
  'dueDate',
  'expectedAmount',
  'expectedPercentage',
  'id',
  'name',
  'payments',
  'status',
] as const;

const PAYMENT_KEYS = [
  'createdAt',
  'id',
  'paidAmount',
  'paymentMethod',
  'paymentNumber',
  'status',
] as const;

/**
 * The five values the mobile app's switch recognises. We emit at most four of
 * them — `cancelled` no longer exists in the ledger model — but emitting
 * anything OUTSIDE this set is what triggers the silent 'LOCKED' render.
 */
const APP_RECOGNISED_STATUSES = ['pending', 'partial', 'paid', 'waived', 'cancelled'];

describe('consumer wire contract (frozen)', () => {
  describe('ConsumerFinancialSummaryResponseDto', () => {
    it('exposes exactly these 9 keys', () => {
      const dto = toDto(ConsumerFinancialSummaryResponseDto, {
        totalExpected: '100000.00',
        totalReceived: '40000.00',
        pending: '60000.00',
        receiptCount: 3,
        contractValue: '100000.00',
        subsidyAmount: '78000.00',
        netCost: '22000.00',
        startDate: '2026-01-01',
        endDate: null,
      });

      expect(Object.keys(dto).sort()).toEqual([...FINANCIAL_SUMMARY_KEYS]);
    });

    it('coerces every money field to a number, not the string pg returns', () => {
      const dto = toDto(ConsumerFinancialSummaryResponseDto, {
        totalExpected: '100000.00',
        totalReceived: '40000.00',
        pending: '60000.00',
        receiptCount: 3,
        contractValue: '100000.00',
        subsidyAmount: '78000.00',
        netCost: '22000.00',
      });

      for (const key of [
        'totalExpected',
        'totalReceived',
        'pending',
        'contractValue',
        'subsidyAmount',
        'netCost',
      ] as const) {
        expect(typeof dto[key]).toBe('number');
      }
      expect(dto.totalExpected).toBe(100000);
    });

    it('drops any field not on the contract', () => {
      const dto = toDto(ConsumerFinancialSummaryResponseDto, {
        totalExpected: 1,
        totalReceived: 1,
        pending: 0,
        receiptCount: 1,
        contractValue: 1,
        subsidyAmount: 0,
        netCost: 1,
        // fields the ledger rebuild adds internally — must NOT leak to the app
        unallocatedPaise: 5000,
        overAllocatedPaise: 0,
        internalLedgerId: 'abc',
      } as never);

      expect(Object.keys(dto).sort()).toEqual([...FINANCIAL_SUMMARY_KEYS]);
    });
  });

  describe('ConsumerPaymentTermDto', () => {
    it('exposes exactly these 8 keys', () => {
      const dto = toDto(ConsumerPaymentTermDto, {
        id: 'm1',
        name: 'Advance',
        displayOrder: 1,
        expectedAmount: '14444.42',
        paidAmount: '14444.42',
        status: PaymentTermStatus.PAID,
        dueDate: '2026-08-12',
        expectedPercentage: '10.00',
        payments: [],
      });

      // NOTE: paidAmount is absent below because @Expose() ordering differs;
      // assert against the full sorted set instead.
      expect(Object.keys(dto).sort()).toEqual([...PAYMENT_TERM_KEYS, 'paidAmount'].sort());
    });

    it('preserves null dueDate and expectedPercentage rather than dropping them', () => {
      const dto = toDto(ConsumerPaymentTermDto, {
        id: 'm1',
        name: 'Advance',
        displayOrder: 1,
        expectedAmount: '100.00',
        paidAmount: '0.00',
        status: PaymentTermStatus.PENDING,
        dueDate: null,
        expectedPercentage: null,
      });

      expect(dto.dueDate).toBeNull();
      expect(dto.expectedPercentage).toBeNull();
    });

    it('coerces expectedAmount and paidAmount to numbers', () => {
      const dto = toDto(ConsumerPaymentTermDto, {
        id: 'm1',
        name: 'Advance',
        displayOrder: 1,
        expectedAmount: '14444.42',
        paidAmount: '2000.00',
        status: PaymentTermStatus.PARTIAL,
      });

      expect(typeof dto.expectedAmount).toBe('number');
      expect(typeof dto.paidAmount).toBe('number');
      expect(dto.expectedAmount).toBe(14444.42);
      expect(dto.paidAmount).toBe(2000);
    });
  });

  describe('ConsumerPaymentDto', () => {
    it('exposes exactly these 6 keys', () => {
      const dto = toDto(ConsumerPaymentDto, {
        id: 'e1',
        paymentNumber: 'RCP-2026-27-000058',
        paidAmount: '130000.00',
        paymentMethod: 'upi',
        status: 'cleared',
        createdAt: '2026-05-30T00:00:00.000Z',
      });

      expect(Object.keys(dto).sort()).toEqual([...PAYMENT_KEYS]);
      expect(typeof dto.paidAmount).toBe('number');
    });
  });

  describe('ConsumerProjectPaymentsResponseDto', () => {
    it('wraps terms in a single `terms` key', () => {
      const dto = toDto(ConsumerProjectPaymentsResponseDto, { terms: [] });
      expect(Object.keys(dto)).toEqual(['terms']);
    });
  });

  describe('status values the mobile app can render', () => {
    it('every PaymentTermStatus we can emit is recognised by the app', () => {
      for (const status of Object.values(PaymentTermStatus)) {
        expect(APP_RECOGNISED_STATUSES).toContain(status);
      }
    });

    it('the app-recognised set is exactly these five lowercase strings', () => {
      // Pinning this stops a future refactor from emitting e.g. 'active' or
      // 'PAID', either of which renders as a locked card with no error.
      expect(APP_RECOGNISED_STATUSES).toEqual([
        'pending',
        'partial',
        'paid',
        'waived',
        'cancelled',
      ]);
    });

    it('all emitted statuses are lowercase', () => {
      for (const status of APP_RECOGNISED_STATUSES) {
        expect(status).toBe(status.toLowerCase());
      }
    });
  });
});
