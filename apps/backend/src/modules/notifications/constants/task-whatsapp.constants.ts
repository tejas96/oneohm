/**
 * Customer WhatsApp alerts for completed steps.
 *
 * The template is created and approved in Meta WhatsApp Manager. Its wording can
 * change there; the code depends only on the name, the language and the three
 * named body parameters: customer_name, project_number, update.
 */
export const PROJECT_STEP_UPDATE_TEMPLATE = {
  name: 'project_step_update',
  language: 'en',
} as const;

/** 77 of 5,003 tasks marked done went back within 10 minutes (2026-09-11). */
export const TASK_WHATSAPP_DELAY_MINUTES = 10;

export const TASK_WHATSAPP_BATCH_SIZE = 50;

/** A row left in `sending` this long belongs to a run that stopped mid-send. */
export const TASK_WHATSAPP_STUCK_MINUTES = 10;

/** Older completions are skipped rather than sent late, e.g. after an outage. */
export const TASK_WHATSAPP_MAX_AGE_HOURS = 24;
