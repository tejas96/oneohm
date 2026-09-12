import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { IntegrationProvider, MessageType, ProjectStatus } from '@tejas96/shared/types';
import { normalizePhoneToE164 } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { IntegrationService } from '../../integrations/services';
import {
  PROJECT_STEP_UPDATE_TEMPLATE,
  TASK_WHATSAPP_BATCH_SIZE,
  TASK_WHATSAPP_DELAY_MINUTES,
  TASK_WHATSAPP_MAX_AGE_HOURS,
  TASK_WHATSAPP_STUCK_MINUTES,
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
 * Sends a customer their step update on WhatsApp, 10 minutes after a task of a
 * ticked step is done.
 *
 * `completed_at` is the only trigger, so no task code has to call this: a task
 * reopened inside the 10 minutes has lost its `completed_at` and is never picked.
 * Each task is claimed in one INSERT … ON CONFLICT before sending, so two
 * instances during a rolling deploy cannot both send it.
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

  @Cron(CronExpression.EVERY_MINUTE, { name: 'notifications:task-whatsapp' })
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

  private async unstick(): Promise<void> {
    await this.dataSource.query(
      `UPDATE task_whatsapp_messages
          SET status = 'failed', reason = 'Send interrupted', updated_at = now()
        WHERE status = 'sending'
          AND updated_at < now() - make_interval(mins => $1)`,
      [TASK_WHATSAPP_STUCK_MINUTES],
    );
  }

  private async findDue(): Promise<DueTask[]> {
    return this.dataSource.query(
      `SELECT t.id AS "taskId", t.project_id AS "projectId", t.completed_at AS "completedAt"
         FROM project_tasks t
         JOIN workflow_steps s ON s.id = t.workflow_step_id
    LEFT JOIN task_whatsapp_messages m ON m.project_task_id = t.id
        WHERE t.deleted_at IS NULL
          AND t.status = 'done'
          AND t.completed_at IS NOT NULL
          AND s.whatsapp_since IS NOT NULL
          AND t.completed_at >= s.whatsapp_since
          AND t.completed_at <= now() - make_interval(mins => $1)
          AND (
                m.id IS NULL
             OR (m.status IN ('failed', 'skipped') AND m.task_completed_at < t.completed_at)
              )
        ORDER BY t.completed_at ASC
        LIMIT $2`,
      [TASK_WHATSAPP_DELAY_MINUTES, TASK_WHATSAPP_BATCH_SIZE],
    );
  }

  /** The row id when this run won the task; null when another run has it or it was already sent. */
  private async claim(task: DueTask): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `INSERT INTO task_whatsapp_messages (project_task_id, project_id, task_completed_at, status)
       VALUES ($1, $2, $3, 'sending')
       ON CONFLICT (project_task_id) DO UPDATE
          SET status = 'sending',
              task_completed_at = EXCLUDED.task_completed_at,
              phone = NULL,
              update_text = NULL,
              reason = NULL,
              provider_message_id = NULL,
              sent_at = NULL,
              delivered_at = NULL,
              read_at = NULL,
              updated_at = now()
        WHERE task_whatsapp_messages.status IN ('failed', 'skipped')
          AND task_whatsapp_messages.task_completed_at < EXCLUDED.task_completed_at
       RETURNING id`,
      [task.taskId, task.projectId, task.completedAt],
    );
    return rows[0]?.id ?? null;
  }

  private async process(task: DueTask): Promise<void> {
    const messageId = await this.claim(task);
    if (!messageId) return;

    try {
      const context = await this.loadContext(task.taskId);
      const skipReason = this.skipReason(task, context);
      if (skipReason || !context) {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages SET status = 'skipped', reason = $2, updated_at = now() WHERE id = $1`,
          [messageId, skipReason ?? 'Task not found'],
        );
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

      await this.dataSource.query(
        `UPDATE task_whatsapp_messages
            SET status = 'sent', provider_message_id = $2, sent_at = now(),
                phone = $3, update_text = $4, reason = NULL, updated_at = now()
          WHERE id = $1`,
        [messageId, result.messageId, phone, updateText],
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Send failed';
      await this.dataSource.query(
        `UPDATE task_whatsapp_messages SET status = 'failed', reason = $2, updated_at = now() WHERE id = $1`,
        [messageId, reason],
      );
      this.logger.warn(`WhatsApp update for task ${task.taskId} failed: ${reason}`);
    }
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
      return 'Done more than 24 hours before sending';
    }
    if (!VALID_E164.test(normalizePhoneToE164(context.phone))) return 'No valid phone';
    if (!context.updateText) return 'Step has no update text';
    return null;
  }
}
