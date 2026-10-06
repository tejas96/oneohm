/**
 * Staff Notification Listener — tells a person the moment work becomes theirs.
 *
 * Every handler re-reads the row, so a stale event (work finished, moved on,
 * deleted) notifies nobody. Skips the actor, inactive users and finished work.
 * Never throws: a notification failure must not look like a failed save.
 *
 * Grouping: one action the web performs as several requests (onboarding's
 * "Create site", removing a member from every task) must not ping a person
 * five times. A message with a `group` merges into the recipient's unread
 * row with the same group key from the last 2 minutes — no second push.
 *
 * Uses @InjectDataSource() for lookups to avoid circular module imports
 * (same pattern as ConsumerNotificationListener).
 *
 * Layer: modules/notifications/listeners
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationSeverity, NotificationType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { staffTargets, type StaffTarget } from './staff-notification.links';
import {
  FollowupAssignedEvent,
  FollowupsReassignedEvent,
  LeadAssignedEvent,
  ProjectAssignedEvent,
  ProjectTeamAddedEvent,
  STAFF_EVENTS,
  SiteWorkAssignedEvent,
  TaskAssignedEvent,
  TaskBlockedEvent,
  TicketAssignedEvent,
} from '../events/staff-notification.events';
import {
  type CreateNotificationInput,
  NotificationService,
} from '../services/notification.service';

interface StaffMessage {
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  target: StaffTarget;
  ids: Record<string, string>;
  /** Several of these for one person within 2 minutes become one row. */
  group?: StaffGroup;
}

/** What a merged row says and opens: the project, site or customer as a whole. */
interface StaffGroup {
  key: string;
  label: string;
  target: StaffTarget;
  /** The ids a merged row keeps in metadata. */
  ids: Record<string, string>;
}

const GROUP_WINDOW = '2 minutes';

const groups = {
  project: (projectId: string, projectName: string): StaffGroup => ({
    key: `project:${projectId}`,
    label: projectName,
    target: staffTargets.project(projectId),
    ids: { projectId },
  }),
  property: (propertyId: string, customerId: string, place: string): StaffGroup => ({
    key: `property:${propertyId}`,
    label: place,
    target: staffTargets.property(propertyId),
    ids: { propertyId, customerId },
  }),
  customer: (customerId: string, customerName: string): StaffGroup => ({
    key: `customer:${customerId}`,
    label: customerName,
    target: staffTargets.lead(customerId),
    ids: { customerId },
  }),
};

/** Merged body parts in this order: the types counted together, and their words. */
const GROUP_PARTS: Array<[NotificationType[], (n: number) => string]> = [
  [[NotificationType.TASK_ASSIGNED], (n) => (n === 1 ? '1 new task' : `${n} new tasks`)],
  [[NotificationType.TASK_BLOCKED], (n) => (n === 1 ? '1 blocked task' : `${n} blocked tasks`)],
  [
    [NotificationType.PROJECT_ASSIGNED, NotificationType.PROJECT_TEAM_ADDED],
    () => 'added to the team',
  ],
  [[NotificationType.LEAD_ASSIGNED], () => 'new lead'],
  [[NotificationType.SITE_VISIT_ASSIGNED], () => 'site visit'],
  [[NotificationType.SITE_SURVEY_ASSIGNED], () => 'site survey'],
  [[NotificationType.FOLLOWUP_ASSIGNED], (n) => (n === 1 ? '1 follow-up' : `${n} follow-ups`)],
];

interface TaskRow {
  projectId: string;
  projectName: string;
  taskName: string;
  status: string;
  assigneeId: string | null;
  blockedReason: string | null;
}

const FOLLOWUP_WHEN = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** `document_collection` → `Document collection`. */
function words(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Keeps the first `max` characters of free text, adding `…` when cut. */
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** How the site message names a place: property name or "<customer>'s site", then city. */
function sitePlace(propertyName: string | null, customerName: string, city: string | null): string {
  const place = propertyName || `${customerName}'s site`;
  return city ? `${place}, ${city}` : place;
}

/** `metadata.groupCounts` of a saved row, ignoring anything that is not a count. */
function readCounts(metadata: Record<string, unknown> | null): Record<string, number> {
  const raw = metadata?.groupCounts;
  const counts: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [type, n] of Object.entries(raw)) if (typeof n === 'number') counts[type] = n;
  }
  return counts;
}

/** "2 new tasks · site visit · 1 follow-up" — only the non-zero parts, first letter capitalised. */
function groupBody(counts: Record<string, number>): string {
  const parts: string[] = [];
  for (const [types, say] of GROUP_PARTS) {
    const n = types.reduce((sum, type) => sum + (counts[type] ?? 0), 0);
    if (n > 0) parts.push(say(n));
  }
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@Injectable()
export class StaffNotificationListener {
  private readonly logger = new Logger(StaffNotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─── Tasks ───────────────────────────────────────────────────────────

  @OnEvent(STAFF_EVENTS.TASK_ASSIGNED, { async: true })
  async onTaskAssigned(e: TaskAssignedEvent): Promise<void> {
    await this.guard('task assigned', async () => {
      const task = await this.loadTask(e.taskId);
      if (!task || task.status === 'done' || task.assigneeId !== e.assigneeUserId) return;
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: NotificationType.TASK_ASSIGNED,
        title: 'New task',
        body: `${task.taskName} – ${task.projectName}`,
        target: staffTargets.projectTasks(task.projectId),
        ids: { projectId: task.projectId, taskId: e.taskId },
        group: groups.project(task.projectId, task.projectName),
      });
    });
  }

  @OnEvent(STAFF_EVENTS.TASK_BLOCKED, { async: true })
  async onTaskBlocked(e: TaskBlockedEvent): Promise<void> {
    await this.guard('task blocked', async () => {
      const task = await this.loadTask(e.taskId);
      if (task?.status !== 'blocked') return;
      const managers: Array<{ userId: string }> = await this.dataSource.query(
        `SELECT user_id AS "userId" FROM project_team_members
          WHERE project_id = $1 AND is_project_manager = true AND deleted_at IS NULL`,
        [task.projectId],
      );
      const reason = task.blockedReason ? ` · ${clip(task.blockedReason, 140)}` : '';
      for (const { userId } of managers) {
        await this.send(userId, e.actorUserId, {
          type: NotificationType.TASK_BLOCKED,
          title: 'Task blocked',
          body: `${task.taskName} – ${task.projectName}${reason}`,
          severity: NotificationSeverity.WARNING,
          target: staffTargets.projectTasks(task.projectId),
          ids: { projectId: task.projectId, taskId: e.taskId },
          group: groups.project(task.projectId, task.projectName),
        });
      }
    });
  }

  // ─── Projects ────────────────────────────────────────────────────────

  /** One notification per person: their team role and how many tasks they hold. */
  @OnEvent(STAFF_EVENTS.PROJECT_ASSIGNED, { async: true })
  async onProjectAssigned(e: ProjectAssignedEvent): Promise<void> {
    await this.guard('project assigned', async () => {
      const project = await this.loadProject(e.projectId);
      if (!project) return;
      const people: Array<{
        userId: string;
        roleName: string | null;
        isPm: boolean;
        taskCount: number;
      }> = await this.dataSource.query(
        `WITH team AS (
           SELECT user_id, role_name, is_project_manager
             FROM project_team_members
            WHERE project_id = $1 AND deleted_at IS NULL
         ), tasks AS (
           SELECT assigned_to_user_id AS user_id, COUNT(*)::int AS n
             FROM project_tasks
            WHERE project_id = $1 AND deleted_at IS NULL
              AND assigned_to_user_id IS NOT NULL AND status <> 'done'
            GROUP BY assigned_to_user_id
         )
         SELECT COALESCE(team.user_id, tasks.user_id) AS "userId",
                team.role_name AS "roleName",
                COALESCE(team.is_project_manager, false) AS "isPm",
                COALESCE(tasks.n, 0) AS "taskCount"
           FROM team FULL OUTER JOIN tasks ON tasks.user_id = team.user_id`,
        [e.projectId],
      );
      for (const p of people) {
        const role = p.isPm ? 'Project Manager' : p.roleName;
        const parts = [role ? `${project.name} as ${role}` : project.name];
        if (p.taskCount > 0) parts.push(`${p.taskCount} ${p.taskCount === 1 ? 'task' : 'tasks'}`);
        await this.send(p.userId, e.actorUserId, {
          type: NotificationType.PROJECT_ASSIGNED,
          title: 'Added to project',
          body: parts.join(' · '),
          target: staffTargets.project(e.projectId),
          ids: { projectId: e.projectId },
          group: groups.project(e.projectId, project.name),
        });
      }
    });
  }

  @OnEvent(STAFF_EVENTS.PROJECT_TEAM_ADDED, { async: true })
  async onProjectTeamAdded(e: ProjectTeamAddedEvent): Promise<void> {
    await this.guard('team added', async () => {
      const project = await this.loadProject(e.projectId);
      const rows: Array<{ roleName: string; isPm: boolean }> = await this.dataSource.query(
        `SELECT role_name AS "roleName", is_project_manager AS "isPm"
           FROM project_team_members
          WHERE project_id = $1 AND user_id = $2 AND deleted_at IS NULL
          LIMIT 1`,
        [e.projectId, e.userId],
      );
      if (!project || !rows[0]) return;
      const role = rows[0].isPm ? 'Project Manager' : rows[0].roleName;
      await this.send(e.userId, e.actorUserId, {
        type: NotificationType.PROJECT_TEAM_ADDED,
        title: 'Added to project',
        body: `${project.name} as ${role}`,
        target: staffTargets.project(e.projectId),
        ids: { projectId: e.projectId },
        group: groups.project(e.projectId, project.name),
      });
    });
  }

  // ─── Leads and follow-ups ────────────────────────────────────────────

  @OnEvent(STAFF_EVENTS.LEAD_ASSIGNED, { async: true })
  async onLeadAssigned(e: LeadAssignedEvent): Promise<void> {
    await this.guard('lead assigned', async () => {
      const rows: Array<{ assigneeId: string | null; name: string; city: string | null }> =
        await this.dataSource.query(
          `SELECT c.assignee_id AS "assigneeId",
                  TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS name,
                  (SELECT p.city FROM customer_properties p
                    WHERE p.customer_id = c.id AND p.deleted_at IS NULL
                    ORDER BY p.created_at LIMIT 1) AS city
             FROM customer_profiles c
            WHERE c.id = $1 AND c.deleted_at IS NULL`,
          [e.customerId],
        );
      const lead = rows[0];
      if (!lead || lead.assigneeId !== e.assigneeUserId) return;
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: NotificationType.LEAD_ASSIGNED,
        title: 'New lead',
        body: lead.city ? `${lead.name}, ${lead.city}` : lead.name,
        target: staffTargets.lead(e.customerId),
        ids: { customerId: e.customerId },
        group: groups.customer(e.customerId, lead.name),
      });
    });
  }

  @OnEvent(STAFF_EVENTS.FOLLOWUP_ASSIGNED, { async: true })
  async onFollowupAssigned(e: FollowupAssignedEvent): Promise<void> {
    await this.guard('follow-up assigned', async () => {
      const rows: Array<{
        assigneeId: string;
        status: string;
        type: string;
        scheduledAt: Date;
        customerId: string;
        propertyId: string | null;
        customerName: string;
        propertyName: string | null;
        city: string | null;
      }> = await this.dataSource.query(
        `SELECT f.assigned_to_user_id AS "assigneeId", f.status, f.type,
                f.scheduled_at AS "scheduledAt", f.customer_id AS "customerId",
                f.property_id AS "propertyId",
                TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS "customerName",
                p.property_name AS "propertyName", p.city
           FROM followups f
           JOIN customer_profiles c ON c.id = f.customer_id
           LEFT JOIN customer_properties p ON p.id = f.property_id
          WHERE f.id = $1 AND f.deleted_at IS NULL`,
        [e.followupId],
      );
      const f = rows[0];
      if (f?.status !== 'pending' || f.assigneeId !== e.assigneeUserId) return;
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: NotificationType.FOLLOWUP_ASSIGNED,
        title: 'Follow-up',
        body: `${f.customerName} · ${words(f.type)} · ${FOLLOWUP_WHEN.format(new Date(f.scheduledAt))}`,
        target: staffTargets.followup({
          id: e.followupId,
          customerId: f.customerId,
          propertyId: f.propertyId,
        }),
        ids: {
          followupId: e.followupId,
          customerId: f.customerId,
          ...(f.propertyId ? { propertyId: f.propertyId } : {}),
        },
        group: f.propertyId
          ? groups.property(
              f.propertyId,
              f.customerId,
              sitePlace(f.propertyName, f.customerName, f.city),
            )
          : groups.customer(f.customerId, f.customerName),
      });
    });
  }

  @OnEvent(STAFF_EVENTS.FOLLOWUPS_REASSIGNED, { async: true })
  async onFollowupsReassigned(e: FollowupsReassignedEvent): Promise<void> {
    await this.guard('follow-ups reassigned', async () => {
      const rows: Array<{ id: string }> = await this.dataSource.query(
        `SELECT id FROM followups
          WHERE id = ANY($1::uuid[]) AND assigned_to_user_id = $2
            AND status = 'pending' AND deleted_at IS NULL`,
        [e.followupIds, e.assigneeUserId],
      );
      const [first] = rows;
      if (!first) return;
      if (rows.length === 1) {
        await this.onFollowupAssigned(
          new FollowupAssignedEvent(first.id, e.assigneeUserId, e.actorUserId),
        );
        return;
      }
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: NotificationType.FOLLOWUP_ASSIGNED,
        title: 'Follow-ups moved to you',
        body: `${rows.length} follow-ups`,
        target: staffTargets.followupList(),
        ids: {},
      });
    });
  }

  // ─── Site work ───────────────────────────────────────────────────────

  @OnEvent(STAFF_EVENTS.SITE_WORK_ASSIGNED, { async: true })
  async onSiteWorkAssigned(e: SiteWorkAssignedEvent): Promise<void> {
    await this.guard('site work assigned', async () => {
      const rows: Array<{
        visitAssignee: string | null;
        surveyAssignee: string | null;
        visitDone: Date | null;
        surveyDone: Date | null;
        propertyName: string | null;
        city: string | null;
        customerId: string;
        customerName: string;
      }> = await this.dataSource.query(
        `SELECT p.site_visit_assignee AS "visitAssignee",
                p.site_survey_assignee AS "surveyAssignee",
                p.site_visit_completed_at AS "visitDone",
                p.site_survey_completed_at AS "surveyDone",
                p.property_name AS "propertyName", p.city, p.customer_id AS "customerId",
                TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS "customerName"
           FROM customer_properties p
           JOIN customer_profiles c ON c.id = p.customer_id
          WHERE p.id = $1 AND p.deleted_at IS NULL`,
        [e.propertyId],
      );
      const p = rows[0];
      if (!p) return;
      const isVisit = e.kind === 'visit';
      const assignee = isVisit ? p.visitAssignee : p.surveyAssignee;
      const done = isVisit ? p.visitDone : p.surveyDone;
      if (assignee !== e.assigneeUserId || done) return;
      const place = sitePlace(p.propertyName, p.customerName, p.city);
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: isVisit
          ? NotificationType.SITE_VISIT_ASSIGNED
          : NotificationType.SITE_SURVEY_ASSIGNED,
        title: isVisit ? 'Site visit' : 'Site survey',
        body: place,
        target: staffTargets.siteWork(e.propertyId, e.kind),
        ids: { propertyId: e.propertyId, customerId: p.customerId },
        group: groups.property(e.propertyId, p.customerId, place),
      });
    });
  }

  // ─── Service tickets ─────────────────────────────────────────────────

  @OnEvent(STAFF_EVENTS.TICKET_ASSIGNED, { async: true })
  async onTicketAssigned(e: TicketAssignedEvent): Promise<void> {
    await this.guard('ticket assigned', async () => {
      const rows: Array<{
        employeeId: string | null;
        userId: string | null;
        status: string;
        ticketNumber: string;
        title: string;
        projectName: string | null;
      }> = await this.dataSource.query(
        `SELECT t.assigned_to_employee_id AS "employeeId", e.user_id AS "userId",
                t.status, t.ticket_number AS "ticketNumber", t.title,
                pr.name AS "projectName"
           FROM service_tickets t
           LEFT JOIN employee_profiles e ON e.id = t.assigned_to_employee_id AND e.deleted_at IS NULL
           LEFT JOIN projects pr ON pr.id = t.project_id
          WHERE t.id = $1 AND t.deleted_at IS NULL`,
        [e.ticketId],
      );
      const t = rows[0];
      if (!t?.userId || t.employeeId !== e.assigneeEmployeeId) return;
      if (t.status === 'resolved' || t.status === 'closed') return;
      await this.send(t.userId, e.actorUserId, {
        type: NotificationType.SERVICE_TICKET_ASSIGNED,
        title: `Ticket ${t.ticketNumber}`,
        body: t.projectName ? `${t.title} – ${t.projectName}` : t.title,
        target: staffTargets.ticket(e.ticketId),
        ids: { ticketId: e.ticketId },
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private async loadTask(taskId: string): Promise<TaskRow | null> {
    const rows: Array<TaskRow> = await this.dataSource.query(
      `SELECT t.project_id AS "projectId", p.name AS "projectName",
              COALESCE(t.name_override, ws.name, t.code) AS "taskName",
              t.status, t.assigned_to_user_id AS "assigneeId",
              t.blocked_reason AS "blockedReason"
         FROM project_tasks t
         JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
         LEFT JOIN workflow_steps ws ON ws.id = t.workflow_step_id
        WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [taskId],
    );
    return rows[0] ?? null;
  }

  private async loadProject(projectId: string): Promise<{ name: string } | null> {
    const rows: Array<{ name: string }> = await this.dataSource.query(
      `SELECT name FROM projects WHERE id = $1 AND deleted_at IS NULL`,
      [projectId],
    );
    return rows[0] ?? null;
  }

  /**
   * Applies the skip rules, then saves the row (which also sends the push) —
   * or, for a grouped message, merges into the recipient's recent unread row.
   */
  private async send(
    recipientId: string | null,
    actorUserId: string | null,
    msg: StaffMessage,
  ): Promise<void> {
    if (!recipientId || recipientId === actorUserId) return;
    // Staff only: a customer or any user without a live employee profile is skipped.
    const active: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM users u
        WHERE u.id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
          AND EXISTS (SELECT 1 FROM employee_profiles e
                       WHERE e.user_id = u.id AND e.deleted_at IS NULL)`,
      [recipientId],
    );
    if (active.length === 0) return;
    const { group } = msg;
    if (!group) {
      await this.notificationService.create(this.toInput(recipientId, msg, {}));
      return;
    }
    // Listeners run concurrently: the lock makes check-then-act one step per
    // (person, group). Everything runs on the transaction's one connection — a
    // second pool connection here could deadlock behind a queue of waiters —
    // and the push goes out only after the commit.
    const created = await this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `${recipientId}|${group.key}`,
      ]);
      const rows: Array<{ id: string; metadata: Record<string, unknown> | null }> =
        await manager.query(
          `SELECT id, metadata FROM notifications
            WHERE user_id = $1 AND read_at IS NULL
              AND metadata->>'groupKey' = $2
              AND created_at > now() - interval '${GROUP_WINDOW}'
            ORDER BY created_at DESC
            LIMIT 1`,
          [recipientId, group.key],
        );
      const previous = rows[0];
      if (!previous) {
        return this.notificationService.createInTransaction(
          this.toInput(recipientId, msg, {
            groupKey: group.key,
            groupCounts: { [msg.type]: 1 },
          }),
          manager,
        );
      }
      const counts = readCounts(previous.metadata);
      counts[msg.type] = (counts[msg.type] ?? 0) + 1;
      const blocked = (counts[NotificationType.TASK_BLOCKED] ?? 0) > 0;
      // created_at moves to now so a slow run of saves keeps merging; no push.
      // clock_timestamp(), not now(): now() is when this transaction began,
      // which can be before the lock wait ended.
      await manager.query(
        `UPDATE notifications
            SET title = $2, body = $3, severity = $4, link = $5, metadata = $6::jsonb,
                created_at = clock_timestamp()
          WHERE id = $1`,
        [
          previous.id,
          group.label,
          groupBody(counts),
          blocked ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
          group.target.link,
          JSON.stringify({
            mobilePath: group.target.mobilePath,
            ...group.ids,
            groupKey: group.key,
            groupCounts: counts,
          }),
        ],
      );
      return null;
    });
    if (created) await this.notificationService.push(created);
  }

  private toInput(
    recipientId: string,
    msg: StaffMessage,
    extra: Record<string, unknown>,
  ): CreateNotificationInput {
    return {
      userId: recipientId,
      type: msg.type,
      title: msg.title,
      body: msg.body,
      severity: msg.severity ?? NotificationSeverity.INFO,
      link: msg.target.link,
      metadata: { mobilePath: msg.target.mobilePath, ...msg.ids, ...extra },
    };
  }

  private async guard(what: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (err) {
      this.logger.error(`Staff notification failed (${what})`, err);
    }
  }
}
