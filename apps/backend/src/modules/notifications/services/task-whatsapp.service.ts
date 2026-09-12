import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IntegrationProvider,
  MessageType,
  ProjectStatus,
  type TaskWhatsappRecord,
} from '@tejas96/shared/types';
import { normalizePhoneToE164 } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { IntegrationService } from '../../integrations/services';
import {
  PROJECT_STEP_UPDATE_TEMPLATE,
  TASK_WHATSAPP_BATCH_SIZE,
  TASK_WHATSAPP_MAX_AGE_HOURS,
  TASK_WHATSAPP_SEND_CRON,
  TASK_WHATSAPP_STUCK_MINUTES,
  TASK_WHATSAPP_TIMEZONE,
} from '../constants/task-whatsapp.constants';

interface DueTask {
  taskId: string;
  projectId: string;
  completedAt: Date;
}

interface SendContext {
  projectStatus: ProjectStatus;
  projectNumber: string;
  firstName: string | null;
  phone: string | null;
  updateText: string | null;
}

const VALID_E164 = /^\+\d{11,15}$/;

/**
 * Sends customers their step updates on WhatsApp, once a day at 6 pm India time.
 *
 * There is no "since yesterday" window. The run asks for done tasks of ticked
 * steps whose `project_tasks.customer_whatsapp` is still empty, so that column
 * is the memory: a missed run sends late rather than losing anything, and a
 * task already sent never comes back.
 *
 * `completed_at` is the only trigger, so no task code has to call this: a task
 * reopened before the send has lost its `completed_at` and is never picked.
 *
 * Two instances cannot both send the same task. `claim` is a single UPDATE
 * whose WHERE repeats the due test, so Postgres' row lock decides the winner:
 * the loser re-evaluates the WHERE against the claim the winner just wrote,
 * matches nothing, and returns no row. Every later write is guarded on the
 * status still being `sending`, so a webhook outcome is never overwritten.
 *
 * It reads tasks with plain SQL, as ConsumerNotificationListener does, so the
 * notifications module does not import the projects module.
 */
@Injectable()
export class TaskWhatsappService {
  private readonly logger = new Logger(TaskWhatsappService.name);
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly integrationService: IntegrationService,
  ) {}

  @Cron(TASK_WHATSAPP_SEND_CRON, {
    name: 'notifications:task-whatsapp',
    timeZone: TASK_WHATSAPP_TIMEZONE,
  })
  async run(): Promise<void> {
    // The local database is a production restore with real customer phones.
    if (process.env.NODE_ENV !== 'production' && process.env.TASK_WHATSAPP_ALLOW_LOCAL !== 'true') {
      return;
    }
    // A slow Meta call must not let the next minute's run overlap this one.
    if (this.running) return;
    this.running = true;

    try {
      await this.unstick();
      const due = await this.findDue();
      for (const task of due) {
        await this.process(task);
      }
    } catch (error) {
      this.logger.error('Task WhatsApp run failed', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Clears rows left mid-send by a run that stopped, and says so loudly.
   *
   * These are not retried: Meta may have accepted the message, and sending
   * again would reach the customer twice. That makes them a permanent loss, so
   * the count is logged as an error rather than left to be discovered in the
   * task drawer one customer at a time. A deploy during the evening send can
   * strand a whole batch this way.
   */
  private async unstick(): Promise<void> {
    const result: unknown = await this.dataSource.query(
      `UPDATE project_tasks
          SET customer_whatsapp = customer_whatsapp || jsonb_build_object(
                'status', 'failed',
                'reason', 'Send interrupted',
                'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
              )
        WHERE customer_whatsapp ->> 'status' = 'sending'
          AND (customer_whatsapp ->> 'updatedAt')::timestamptz < now() - make_interval(mins => $1)`,
      [TASK_WHATSAPP_STUCK_MINUTES],
    );

    // node-postgres returns [rows, rowCount] for an UPDATE with no RETURNING.
    const stranded = Array.isArray(result) && typeof result[1] === 'number' ? result[1] : 0;
    if (stranded > 0) {
      this.logger.error(
        `${stranded} customer WhatsApp update(s) were interrupted mid-send and will not be retried. ` +
          `Those customers were not told. Find them with: ` +
          `SELECT code FROM project_tasks WHERE customer_whatsapp ->> 'reason' = 'Send interrupted'`,
      );
    }
  }

  private async findDue(): Promise<DueTask[]> {
    return this.dataSource.query(
      `SELECT t.id AS "taskId", t.project_id AS "projectId", t.completed_at AS "completedAt"
         FROM project_tasks t
         JOIN workflow_steps s ON s.id = t.workflow_step_id
        WHERE t.deleted_at IS NULL
          AND t.status = 'done'
          AND t.completed_at IS NOT NULL
          AND s.whatsapp_since IS NOT NULL
          AND t.completed_at >= s.whatsapp_since
          AND (
                t.customer_whatsapp IS NULL
             OR (
                  t.customer_whatsapp ->> 'status' IN ('failed', 'skipped')
                  AND (t.customer_whatsapp ->> 'taskCompletedAt')::timestamptz < t.completed_at
                )
              )
        ORDER BY t.completed_at ASC
        LIMIT $1`,
      [TASK_WHATSAPP_BATCH_SIZE],
    );
  }

  /**
   * Takes the task, or returns false when another run already has it.
   *
   * The WHERE repeats the due test, so the row lock decides the winner: a second
   * instance reaching the same task finds the status already `sending` and
   * updates nothing. Only `customer_whatsapp` is written, so the task's own
   * `updated_at` and `version` never move.
   */
  private async claim(task: DueTask): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `UPDATE project_tasks
          SET customer_whatsapp = jsonb_build_object(
                'status', 'sending',
                'taskCompletedAt', to_char($2::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
              )
        WHERE id = $1
          AND (
                customer_whatsapp IS NULL
             OR (
                  customer_whatsapp ->> 'status' IN ('failed', 'skipped')
                  AND (customer_whatsapp ->> 'taskCompletedAt')::timestamptz < $2::timestamptz
                )
              )
       RETURNING id`,
      [task.taskId, task.completedAt],
    );
    return rows.length > 0;
  }

  private async process(task: DueTask): Promise<void> {
    const won = await this.claim(task);
    if (!won) return;

    try {
      const context = await this.loadContext(task.taskId);
      const skipReason = this.skipReason(task, context);
      if (skipReason || !context) {
        await this.record(task.taskId, {
          status: 'skipped',
          reason: skipReason ?? 'Task not found',
        });
        return;
      }

      const phone = normalizePhoneToE164(context.phone);
      const updateText = context.updateText as string;

      const result = await this.integrationService.sendTemplateMessage(
        {
          to: phone,
          type: MessageType.TEMPLATE,
          templateName: PROJECT_STEP_UPDATE_TEMPLATE.name,
          templateLanguage: PROJECT_STEP_UPDATE_TEMPLATE.language,
          templateParameters: {
            body: {
              customer_name: context.firstName?.trim() || 'Customer',
              project_number: context.projectNumber,
              update: updateText,
            },
          },
          metadata: { entityType: 'project_task', entityId: task.taskId },
        },
        IntegrationProvider.WHATSAPP_BUSINESS,
      );

      await this.record(task.taskId, {
        status: 'sent',
        providerMessageId: result.messageId,
        sentAt: new Date().toISOString(),
        phone,
        updateText,
        reason: null,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Send failed';
      await this.record(task.taskId, { status: 'failed', reason });
      this.logger.warn(`WhatsApp update for task ${task.taskId} failed: ${reason}`);
    }
  }

  /**
   * Merges this run's outcome into the task's record, keeping what the claim
   * wrote (the completion it answers) and touching no other column on the task.
   *
   * It only applies while the record is still `sending`, so an outcome the
   * webhook has already reported wins. Meta can post a `failed` status within a
   * second of handing back the message id; without this guard that failure
   * would be overwritten by our own `sent`, and the office would be told a
   * rejected message went out.
   */
  private async record(taskId: string, patch: Partial<TaskWhatsappRecord>): Promise<void> {
    await this.dataSource.query(
      `UPDATE project_tasks
          SET customer_whatsapp = customer_whatsapp || $2::jsonb
        WHERE id = $1
          AND customer_whatsapp ->> 'status' = 'sending'`,
      [taskId, JSON.stringify({ ...patch, updatedAt: new Date().toISOString() })],
    );
  }

  private async loadContext(taskId: string): Promise<SendContext | null> {
    const rows: SendContext[] = await this.dataSource.query(
      `SELECT p.status               AS "projectStatus",
              p.project_number       AS "projectNumber",
              c.first_name           AS "firstName",
              c.phone                AS "phone",
              s.customer_update_text AS "updateText"
         FROM project_tasks t
         JOIN projects p             ON p.id = t.project_id
         JOIN customer_properties cp ON cp.id = p.property_id
         JOIN customer_profiles c    ON c.id = cp.customer_id
         JOIN workflow_steps s       ON s.id = t.workflow_step_id
        WHERE t.id = $1`,
      [taskId],
    );
    return rows[0] ?? null;
  }

  private skipReason(task: DueTask, context: SendContext | null): string | null {
    if (!context) return 'Task not found';
    if (context.projectStatus === ProjectStatus.CANCELLED) return 'Project cancelled';
    const ageMs = Date.now() - new Date(task.completedAt).getTime();
    if (ageMs > TASK_WHATSAPP_MAX_AGE_HOURS * 3_600_000) {
      return `Done more than ${TASK_WHATSAPP_MAX_AGE_HOURS} hours before sending`;
    }
    if (!VALID_E164.test(normalizePhoneToE164(context.phone))) return 'No valid phone';
    if (!context.updateText) return 'Step has no update text';
    return null;
  }
}
