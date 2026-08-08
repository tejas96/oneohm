import { describe, it, expect } from '@jest/globals';

import { LeadTemperature } from '../enums/customer.enum';
import { nextFollowupDate, LEAD_TEMPERATURE_CADENCE_DAYS } from './followup-cadence';

describe('nextFollowupDate', () => {
  const from = new Date('2026-08-08T10:30:00.000Z');

  it('adds 3 days for HOT', () => {
    expect(nextFollowupDate(from, LeadTemperature.HOT).toISOString()).toBe(
      '2026-08-11T10:30:00.000Z',
    );
  });

  it('adds 10 days for WARM', () => {
    expect(nextFollowupDate(from, LeadTemperature.WARM).toISOString()).toBe(
      '2026-08-18T10:30:00.000Z',
    );
  });

  it('adds 15 days for COLD', () => {
    expect(nextFollowupDate(from, LeadTemperature.COLD).toISOString()).toBe(
      '2026-08-23T10:30:00.000Z',
    );
  });

  it('adds 3 days when there is no temperature (customer lead unit)', () => {
    expect(nextFollowupDate(from, null).toISOString()).toBe('2026-08-11T10:30:00.000Z');
    expect(nextFollowupDate(from, undefined).toISOString()).toBe('2026-08-11T10:30:00.000Z');
  });

  it('does not mutate the input date', () => {
    const original = new Date('2026-08-08T10:30:00.000Z');
    nextFollowupDate(original, LeadTemperature.HOT);
    expect(original.toISOString()).toBe('2026-08-08T10:30:00.000Z');
  });

  it('exposes the documented cadence table', () => {
    expect(LEAD_TEMPERATURE_CADENCE_DAYS).toEqual({ hot: 3, warm: 10, cold: 15 });
  });
});
