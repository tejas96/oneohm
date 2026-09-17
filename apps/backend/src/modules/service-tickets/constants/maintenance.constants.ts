/**
 * Every hour. The env override exists only so a developer can set
 * `MAINTENANCE_CRON="* * * * *"` locally instead of waiting an hour.
 */
export const MAINTENANCE_CRON = process.env.MAINTENANCE_CRON || '0 * * * *';
export const MAINTENANCE_TIMEZONE = 'Asia/Kolkata';

export const MAINTENANCE_OPENED_TEMPLATE = {
  name: 'maintenance_visit_opened',
  language: 'en',
} as const;
export const MAINTENANCE_CLOSED_TEMPLATE = {
  name: 'maintenance_visit_closed',
  language: 'en',
} as const;

/** Sends only between these India hours (start inclusive, end exclusive). */
export const MAINTENANCE_SEND_HOUR_START = 9;
export const MAINTENANCE_SEND_HOUR_END = 20;

export const MAINTENANCE_SEND_BATCH_SIZE = 200;
export const MAINTENANCE_STUCK_MINUTES = 10;
export const MAINTENANCE_MAX_AGE_HOURS = 48;
