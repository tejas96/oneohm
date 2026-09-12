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

/**
 * The job sends once a day, at 6 pm India time, so a customer never gets a
 * message late at night and never gets several in one evening.
 *
 * The timezone is pinned because the server runs on UTC: without it the cron
 * would fire at 11:30 pm India time.
 */
export const TASK_WHATSAPP_SEND_CRON = '0 18 * * *';
export const TASK_WHATSAPP_TIMEZONE = 'Asia/Kolkata';

/**
 * One run now carries a whole day. The busiest day in the data finished 437
 * tasks, so a batch sized for a per-minute job would have dropped most of them.
 */
export const TASK_WHATSAPP_BATCH_SIZE = 500;

/** A row left in `sending` this long belongs to a run that stopped mid-send. */
export const TASK_WHATSAPP_STUCK_MINUTES = 10;

/**
 * Older completions are skipped rather than sent late, e.g. after an outage.
 *
 * This has to clear a full day, because a task finished just after 6 pm waits
 * until the next evening and is already nearly 24 hours old when it is sent.
 * The extra day on top is the slack for a run that does not happen.
 */
export const TASK_WHATSAPP_MAX_AGE_HOURS = 48;

/** 6 pm in Asia/Kolkata, as UTC. India has no daylight saving, so this is fixed. */
const SEND_HOUR_UTC = 12;
const SEND_MINUTE_UTC = 30;

/**
 * When a task finished at `completedAt` will be messaged: the next 6 pm India
 * time at or after it finished.
 *
 * The task drawer shows this, so the office can tell a customer when the update
 * goes out rather than guessing.
 */
export function nextCustomerWhatsappSendAt(completedAt: Date): Date {
  const finished = completedAt.getTime();
  const sendAt = new Date(finished);
  sendAt.setUTCHours(SEND_HOUR_UTC, SEND_MINUTE_UTC, 0, 0);
  if (sendAt.getTime() < finished) {
    sendAt.setUTCDate(sendAt.getUTCDate() + 1);
  }
  return sendAt;
}
