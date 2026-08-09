import { LeadTemperature } from '../enums/customer.enum';

/**
 * How many days ahead the next followup is prefilled, by lead temperature.
 *
 * Prefill only — always editable, never enforced. Changing a property's
 * temperature does not move followups that are already scheduled.
 */
export const LEAD_TEMPERATURE_CADENCE_DAYS: Record<LeadTemperature, number> = {
  [LeadTemperature.HOT]: 3,
  [LeadTemperature.WARM]: 10,
  [LeadTemperature.COLD]: 15,
};

/**
 * A customer with no property yet has no temperature. It is a fresh enquiry and
 * the goal is to capture a site quickly, so it is chased on the HOT rhythm.
 */
export const CUSTOMER_LEAD_CADENCE_DAYS = 3;

/** Returns a new Date; never mutates the input. */
export function nextFollowupDate(from: Date, temperature?: LeadTemperature | null): Date {
  const days = temperature
    ? LEAD_TEMPERATURE_CADENCE_DAYS[temperature]
    : CUSTOMER_LEAD_CADENCE_DAYS;
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}
