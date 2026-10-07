# Staff Notifications — PR 1 (instant events) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When work is given to a staff member, they get a notification right away — in the web bell, on a new `/notifications` page, and (once the mobile PR ships) as a phone push.

**Architecture:** Domain services emit small `STAFF_EVENTS` (ids only) after their save commits. One `StaffNotificationListener` in the notifications module re-reads the current row, applies the skip rules, builds the text and links, and calls the existing `NotificationService.create()` (which saves the row and sends the FCM push). Web gets a shared notification row, a "See all" link and a full list page.

**Tech Stack:** NestJS 11, TypeORM 0.3, Postgres, `@nestjs/event-emitter`, `@nestjs/schedule`; Next.js 16, React Query 5, MUI; `@tejas96/shared`.

**Spec:** `docs/superpowers/specs/2026-10-06-staff-notifications-design.md`

**This plan covers PR 1 only.** The mobile PR and oneohm PR 2 (summaries + Late work) get their own plans, written when PR 1 has merged and the shared package is published.

## Global Constraints

- Repo `/Volumes/works-space/oneohm/oneohm`, branch `feat/staff-notifications` (already created from `origin/main`, upstream unset). Do not create worktrees. Do not switch branches.
- **No new unit tests.** Each task is checked with `npm run typecheck:backend` / `npm run typecheck:web` / lint; the whole PR is checked by using the screens (Task 10).
- No notification when: the recipient is the actor; the assignee is cleared; the recipient's `users.status <> 'active'` or `users.deleted_at IS NOT NULL`; the item is finished (task `done`; ticket `resolved`/`closed`; follow-up not `pending`; site visit/survey completed).
- Emit events only after the final commit of the save.
- Staff notification `metadata` holds only `mobilePath` and entity ids (`projectId`, `taskId`, `customerId`, `followupId`, `propertyId`, `ticketId`). No other keys — metadata is spread over `type`/`link`/`severity` in the push payload.
- Instant notifications use no `dedupeKey`.
- Do not hand-bump `libs/shared/package.json`; CI auto-bumps on merge.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `libs/shared/src/types/enums/notification.enum.ts` | modify | new `NotificationType` values |
| `libs/shared/src/types/interfaces/notification.interface.ts` | create | shared `NotificationItem` shape |
| `apps/backend/src/modules/notifications/events/staff-notification.events.ts` | create | event names + payload classes |
| `apps/backend/src/modules/notifications/listeners/staff-notification.links.ts` | create | web `link` + `mobilePath` builders |
| `apps/backend/src/modules/notifications/listeners/staff-notification.listener.ts` | create | one handler per event |
| `apps/backend/src/modules/notifications/services/notification-cleanup.service.ts` | create | nightly purge |
| `apps/backend/src/modules/notifications/notifications.module.ts` | modify | register listener + cleanup |
| `apps/backend/src/modules/notifications/controllers/notification.controller.ts` | modify | cap `limit` at 50 |
| `apps/backend/src/modules/projects/services/project-task.service.ts` | modify | emit task assigned / blocked |
| `apps/backend/src/modules/projects/services/project.service.ts` | modify | emit project assigned |
| `apps/backend/src/modules/projects/services/project-team.service.ts` + controller | modify | emit team added, pass actor |
| `apps/backend/src/modules/customers/services/customer.service.ts` | modify | emit lead assigned |
| `apps/backend/src/modules/customers/services/followup.service.ts` | modify | emit follow-up assigned |
| `apps/backend/src/modules/customers/services/customer-property.service.ts` | modify | emit site visit / survey assigned |
| `apps/backend/src/modules/service-tickets/services/service-ticket.service.ts` | modify | emit ticket assigned |
| `apps/backend/src/modules/auth/…` + `users/…device-token…` | modify | logout deactivates the phone's token |
| `apps/web/components/layout/notification-row.tsx` | create | one row + icon per type + open logic |
| `apps/web/components/layout/notification-bell.tsx` | modify | use the row, add "See all" |
| `apps/web/lib/hooks/resources/notifications.ts` | modify | shared type, paged hook |
| `apps/web/components/features/notifications/notifications-page.tsx` | create | full list page |
| `apps/web/app/(dashboard)/notifications/page.tsx` | create | route |
| `apps/web/lib/rbac/route-map.ts` | modify | `/notifications` ALWAYS_OPEN |

---

### Task 1: Shared types

**Files:**
- Modify: `libs/shared/src/types/enums/notification.enum.ts`
- Create: `libs/shared/src/types/interfaces/notification.interface.ts`
- Modify: `libs/shared/src/types/interfaces/index.ts`

**Interfaces:**
- Produces: `NotificationType.TASK_ASSIGNED … ADMIN_DAILY_SUMMARY`; `NotificationItem`.

- [ ] **Step 1: Add the enum values** after `PAYMENT_REJECTED = 'payment_rejected',`:

```ts
  // Staff work — "this is yours now" (instant) and the morning summaries
  TASK_ASSIGNED = 'task_assigned',
  TASK_BLOCKED = 'task_blocked',
  PROJECT_ASSIGNED = 'project_assigned',
  PROJECT_TEAM_ADDED = 'project_team_added',
  LEAD_ASSIGNED = 'lead_assigned',
  FOLLOWUP_ASSIGNED = 'followup_assigned',
  SITE_VISIT_ASSIGNED = 'site_visit_assigned',
  SITE_SURVEY_ASSIGNED = 'site_survey_assigned',
  SERVICE_TICKET_ASSIGNED = 'service_ticket_assigned',
  DAILY_SUMMARY = 'daily_summary',
  ADMIN_DAILY_SUMMARY = 'admin_daily_summary',
```

(The two summary values ship now so the mobile app, which installs the shared package from the registry, can route them before PR 2 lands.)

- [ ] **Step 2: Create `libs/shared/src/types/interfaces/notification.interface.ts`:**

```ts
/**
 * One row of `GET /notifications`, as web and mobile read it.
 * Unread is `readAt === null`; there is no `isRead`.
 */
export interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  /** Web path. Customer notifications carry `/consumer/...`, which web skips. */
  link: string | null;
  /** Staff notifications: `mobilePath` plus entity ids only. */
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
```

- [ ] **Step 3: Export it** — add `export * from './notification.interface';` to `libs/shared/src/types/interfaces/index.ts` (keep the file's existing order style).

- [ ] **Step 4: Verify**

Run: `npm run typecheck:libs`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/src/types
git commit -m "feat(shared): staff notification types"
```

---

### Task 2: Events, links and the listener

**Files:**
- Create: `apps/backend/src/modules/notifications/events/staff-notification.events.ts`
- Create: `apps/backend/src/modules/notifications/listeners/staff-notification.links.ts`
- Create: `apps/backend/src/modules/notifications/listeners/staff-notification.listener.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.module.ts`

**Interfaces:**
- Consumes: `NotificationService.create(input: CreateNotificationInput)`; `NotificationType` from Task 1.
- Produces (used by Tasks 3–6): `STAFF_EVENTS` and these classes, all with `actorUserId: string | null` last:
  - `TaskAssignedEvent(taskId, assigneeUserId, actorUserId)`
  - `TaskBlockedEvent(taskId, actorUserId)`
  - `ProjectAssignedEvent(projectId, actorUserId)`
  - `ProjectTeamAddedEvent(projectId, userId, actorUserId)`
  - `LeadAssignedEvent(customerId, assigneeUserId, actorUserId)`
  - `FollowupAssignedEvent(followupId, assigneeUserId, actorUserId)`
  - `FollowupsReassignedEvent(followupIds: string[], assigneeUserId, actorUserId)`
  - `SiteWorkAssignedEvent(propertyId, kind: 'visit' | 'survey', assigneeUserId, actorUserId)`
  - `TicketAssignedEvent(ticketId, assigneeEmployeeId, actorUserId)`

- [ ] **Step 1: Create the events file**

```ts
/**
 * Staff Notification Events — "this work is yours now".
 *
 * Payloads carry ids only. The listener re-reads the row, so an event that
 * arrives after the work was finished, reassigned or deleted notifies nobody.
 * Emit only after the save has committed.
 *
 * Layer: modules/notifications/events
 */

export const STAFF_EVENTS = {
  TASK_ASSIGNED: 'staff.task.assigned',
  TASK_BLOCKED: 'staff.task.blocked',
  PROJECT_ASSIGNED: 'staff.project.assigned',
  PROJECT_TEAM_ADDED: 'staff.project.team_added',
  LEAD_ASSIGNED: 'staff.lead.assigned',
  FOLLOWUP_ASSIGNED: 'staff.followup.assigned',
  FOLLOWUPS_REASSIGNED: 'staff.followups.reassigned',
  SITE_WORK_ASSIGNED: 'staff.site_work.assigned',
  TICKET_ASSIGNED: 'staff.ticket.assigned',
} as const;

export class TaskAssignedEvent {
  constructor(
    public readonly taskId: string,
    public readonly assigneeUserId: string,
    public readonly actorUserId: string | null,
  ) {}
}

export class TaskBlockedEvent {
  constructor(
    public readonly taskId: string,
    public readonly actorUserId: string | null,
  ) {}
}

/** A project was created from a quote — its team and task assignees are told once each. */
export class ProjectAssignedEvent {
  constructor(
    public readonly projectId: string,
    public readonly actorUserId: string | null,
  ) {}
}

export class ProjectTeamAddedEvent {
  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly actorUserId: string | null,
  ) {}
}

export class LeadAssignedEvent {
  constructor(
    public readonly customerId: string,
    public readonly assigneeUserId: string,
    public readonly actorUserId: string | null,
  ) {}
}

export class FollowupAssignedEvent {
  constructor(
    public readonly followupId: string,
    public readonly assigneeUserId: string,
    public readonly actorUserId: string | null,
  ) {}
}

/** Bulk handoff — one notification for the whole batch. */
export class FollowupsReassignedEvent {
  constructor(
    public readonly followupIds: string[],
    public readonly assigneeUserId: string,
    public readonly actorUserId: string | null,
  ) {}
}

export class SiteWorkAssignedEvent {
  constructor(
    public readonly propertyId: string,
    public readonly kind: 'visit' | 'survey',
    public readonly assigneeUserId: string,
    public readonly actorUserId: string | null,
  ) {}
}

/** Tickets store an employee profile id, not a user id. */
export class TicketAssignedEvent {
  constructor(
    public readonly ticketId: string,
    public readonly assigneeEmployeeId: string,
    public readonly actorUserId: string | null,
  ) {}
}
```

- [ ] **Step 2: Create the links file**

```ts
/**
 * Where a staff notification opens.
 *
 * `link` is the web path; `mobilePath` is the EPC app path without `oneohm://`,
 * resolved by the app's own linking config (oneohm-mobile/src/app/routes.tsx).
 * Mobile task notifications open the project: the task detail screen is still
 * a placeholder there.
 */
export interface StaffTarget {
  link: string;
  mobilePath: string;
}

export const staffTargets = {
  project: (projectId: string): StaffTarget => ({
    link: `/projects/${projectId}`,
    mobilePath: `projects/${projectId}`,
  }),
  projectTasks: (projectId: string): StaffTarget => ({
    link: `/projects/${projectId}?tab=tasks`,
    mobilePath: `projects/${projectId}`,
  }),
  lead: (customerId: string): StaffTarget => ({
    link: `/customers/${customerId}`,
    mobilePath: `leads/${customerId}`,
  }),
  /** Same URL as the web's followupRecordHref(): property first, else customer. */
  followup: (f: { id: string; customerId: string; propertyId: string | null }): StaffTarget => ({
    link: f.propertyId
      ? `/properties/${f.propertyId}?tab=followups&followupId=${f.id}`
      : `/customers/${f.customerId}?tab=followups&followupId=${f.id}`,
    mobilePath: `more/followups/${f.id}`,
  }),
  followupList: (): StaffTarget => ({ link: '/followups', mobilePath: 'more/followups' }),
  siteWork: (propertyId: string, kind: 'visit' | 'survey'): StaffTarget => ({
    link: `/properties/${propertyId}`,
    mobilePath: `more/site-activity/job/${propertyId}/${kind}`,
  }),
  ticket: (ticketId: string): StaffTarget => ({
    link: `/service/${ticketId}`,
    mobilePath: `more/service-tickets/${ticketId}`,
  }),
};
```

- [ ] **Step 3: Create the listener**

```ts
/**
 * Staff Notification Listener — tells a person the moment work becomes theirs.
 *
 * Every handler re-reads the row, so a stale event (work finished, moved on,
 * deleted) notifies nobody. Skips the actor, inactive users and finished work.
 * Never throws: a notification failure must not look like a failed save.
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
import { NotificationService } from '../services/notification.service';

interface StaffMessage {
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  target: StaffTarget;
  ids: Record<string, string>;
}

const FOLLOWUP_WHEN = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

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
      });
    });
  }

  @OnEvent(STAFF_EVENTS.TASK_BLOCKED, { async: true })
  async onTaskBlocked(e: TaskBlockedEvent): Promise<void> {
    await this.guard('task blocked', async () => {
      const task = await this.loadTask(e.taskId);
      if (!task || task.status !== 'blocked') return;
      const managers: Array<{ userId: string }> = await this.dataSource.query(
        `SELECT user_id AS "userId" FROM project_team_members
          WHERE project_id = $1 AND is_project_manager = true AND deleted_at IS NULL`,
        [task.projectId],
      );
      const reason = task.blockedReason ? ` · ${task.blockedReason}` : '';
      for (const { userId } of managers) {
        await this.send(userId, e.actorUserId, {
          type: NotificationType.TASK_BLOCKED,
          title: 'Task blocked',
          body: `${task.taskName} – ${task.projectName}${reason}`,
          severity: NotificationSeverity.WARNING,
          target: staffTargets.projectTasks(task.projectId),
          ids: { projectId: task.projectId, taskId: e.taskId },
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
      }> = await this.dataSource.query(
        `SELECT f.assigned_to_user_id AS "assigneeId", f.status, f.type,
                f.scheduled_at AS "scheduledAt", f.customer_id AS "customerId",
                f.property_id AS "propertyId",
                TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS "customerName"
           FROM followups f
           JOIN customer_profiles c ON c.id = f.customer_id
          WHERE f.id = $1 AND f.deleted_at IS NULL`,
        [e.followupId],
      );
      const f = rows[0];
      if (!f || f.status !== 'pending' || f.assigneeId !== e.assigneeUserId) return;
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: NotificationType.FOLLOWUP_ASSIGNED,
        title: 'Follow-up',
        body: `${f.customerName} · ${f.type} · ${FOLLOWUP_WHEN.format(new Date(f.scheduledAt))}`,
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
      if (rows.length === 0) return;
      if (rows.length === 1) {
        await this.onFollowupAssigned(
          new FollowupAssignedEvent(rows[0].id, e.assigneeUserId, e.actorUserId),
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
      const place = p.propertyName || `${p.customerName}'s site`;
      await this.send(e.assigneeUserId, e.actorUserId, {
        type: isVisit ? NotificationType.SITE_VISIT_ASSIGNED : NotificationType.SITE_SURVEY_ASSIGNED,
        title: isVisit ? 'Site visit' : 'Site survey',
        body: p.city ? `${place}, ${p.city}` : place,
        target: staffTargets.siteWork(e.propertyId, e.kind),
        ids: { propertyId: e.propertyId, customerId: p.customerId },
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
           LEFT JOIN employee_profiles e ON e.id = t.assigned_to_employee_id
           LEFT JOIN projects pr ON pr.id = t.project_id
          WHERE t.id = $1 AND t.deleted_at IS NULL`,
        [e.ticketId],
      );
      const t = rows[0];
      if (!t || !t.userId || t.employeeId !== e.assigneeEmployeeId) return;
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

  private async loadTask(taskId: string): Promise<{
    projectId: string;
    projectName: string;
    taskName: string;
    status: string;
    assigneeId: string | null;
    blockedReason: string | null;
  } | null> {
    const rows = await this.dataSource.query(
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
    const rows = await this.dataSource.query(
      `SELECT name FROM projects WHERE id = $1 AND deleted_at IS NULL`,
      [projectId],
    );
    return rows[0] ?? null;
  }

  /** Applies the skip rules, then saves the row (which also sends the push). */
  private async send(
    recipientId: string | null,
    actorUserId: string | null,
    msg: StaffMessage,
  ): Promise<void> {
    if (!recipientId || recipientId === actorUserId) return;
    const active: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`,
      [recipientId],
    );
    if (active.length === 0) return;
    await this.notificationService.create({
      userId: recipientId,
      type: msg.type,
      title: msg.title,
      body: msg.body,
      severity: msg.severity ?? NotificationSeverity.INFO,
      link: msg.target.link,
      metadata: { mobilePath: msg.target.mobilePath, ...msg.ids },
    });
  }

  private async guard(what: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (err) {
      this.logger.error(`Staff notification failed (${what})`, err);
    }
  }
}
```

- [ ] **Step 4: Register it** in `notifications.module.ts`: import `StaffNotificationListener` from `./listeners/staff-notification.listener` and add it to `providers` after `ConsumerNotificationListener`.

- [ ] **Step 5: Verify**

Run: `npm run typecheck:backend && npx nx run backend:lint`
Expected: both exit 0. (If `projects.deleted_at` or `customer_properties.created_at` turn out not to exist, run `\d projects` / `\d customer_properties` in psql and adjust the SQL — do not guess.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/notifications
git commit -m "feat(notifications): staff events and listener"
```

---

### Task 3: Emit task assigned / blocked

**Files:**
- Modify: `apps/backend/src/modules/projects/services/project-task.service.ts` (already injects `eventEmitter: EventEmitter2` at :94)

**Interfaces:**
- Consumes: `STAFF_EVENTS`, `TaskAssignedEvent`, `TaskBlockedEvent` from Task 2.

- [ ] **Step 1: Import** at the top, beside the existing `CONSUMER_EVENTS` import:

```ts
import {
  STAFF_EVENTS,
  TaskAssignedEvent,
  TaskBlockedEvent,
} from '../../notifications/events/staff-notification.events';
```

- [ ] **Step 2: Add the helper** as the first private method in the class:

```ts
  /**
   * Tells the new assignee, and the project managers when the task became
   * blocked. Call after the write has committed.
   */
  private emitTaskChanges(
    taskId: string,
    before: { assignee: string | null | undefined; status: TaskStatus | null | undefined },
    after: { assignee: string | null | undefined; status: TaskStatus | null | undefined },
    actorUserId: string,
  ): void {
    if (after.assignee && after.assignee !== before.assignee) {
      this.eventEmitter.emit(
        STAFF_EVENTS.TASK_ASSIGNED,
        new TaskAssignedEvent(taskId, after.assignee, actorUserId),
      );
    }
    if (after.status === TaskStatus.BLOCKED && before.status !== TaskStatus.BLOCKED) {
      this.eventEmitter.emit(STAFF_EVENTS.TASK_BLOCKED, new TaskBlockedEvent(taskId, actorUserId));
    }
  }
```

- [ ] **Step 3: `create` (:99)** — replace the last line `return this.taskRepository.findById(saved.id, projectId) as Promise<ProjectTaskEntity>;` with:

```ts
    const result = (await this.taskRepository.findById(saved.id, projectId)) as ProjectTaskEntity;
    this.emitTaskChanges(
      saved.id,
      { assignee: null, status: null },
      { assignee: createDto.assignedToUserId, status: createDto.status as TaskStatus | undefined },
      currentUserId,
    );
    return result;
```

- [ ] **Step 4: `update` (:268)** — directly after the `if (!updated) { throw new NotFoundException(\`Task with ID ${id} not found\`); }` block inside `update`, add:

```ts
    this.emitTaskChanges(
      id,
      { assignee: existingTask.assignedToUserId, status: existingTask.status },
      { assignee: updateDto.assignedToUserId, status: undefined },
      currentUserId,
    );
```

- [ ] **Step 5: `updateStatus` (:394)** — directly after its `if (!updated) { throw … }` block, add:

```ts
    this.emitTaskChanges(
      id,
      { assignee: existingTask.assignedToUserId, status: existingTask.status },
      { assignee: undefined, status: newStatus },
      currentUserId,
    );
```

- [ ] **Step 6: `assignTask` (:477)** — replace its final `return updated;` with:

```ts
    this.emitTaskChanges(
      id,
      { assignee: existingTask.assignedToUserId, status: existingTask.status },
      { assignee: assignedToUserId, status: undefined },
      currentUserId,
    );
    return updated;
```

- [ ] **Step 7: `moveTask` (:626)** — inside the transaction change `return { updated, statusChanged: newStatus !== existingTask.status };` to `return { updated, statusChanged: newStatus !== existingTask.status, oldStatus: existingTask.status };`, then replace the method's final `return result.updated;` with:

```ts
    this.emitTaskChanges(
      id,
      { assignee: undefined, status: result.oldStatus },
      { assignee: undefined, status: newStatus },
      currentUserId,
    );
    return result.updated;
```

- [ ] **Step 8: `updateTaskCrossProject` (:1321)** — directly after the `if (Object.keys(updateData).length > 0) { … }` block, add:

```ts
    this.emitTaskChanges(
      taskId,
      { assignee: task.assignedToUserId, status: task.status },
      { assignee: dto.assignedToUserId, status: dto.status },
      currentUserId,
    );
```

- [ ] **Step 9: Verify** — `npm run typecheck:backend && npx nx run backend:lint` → exit 0.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/modules/projects/services/project-task.service.ts
git commit -m "feat(tasks): notify on task assigned and blocked"
```

---

### Task 4: Emit project assigned and team added

**Files:**
- Modify: `apps/backend/src/modules/projects/services/project.service.ts`
- Modify: `apps/backend/src/modules/projects/services/project-team.service.ts`
- Modify: `apps/backend/src/modules/projects/controllers/project-team.controller.ts:35-45`

- [ ] **Step 1: `convertFromQuote`** — add `ProjectAssignedEvent, STAFF_EVENTS` to imports from `'../../notifications/events/staff-notification.events'`, and directly after the existing `PROJECT_ONBOARDED` emit (:550-558), before `return project;`, add:

```ts
    // After the creation transaction committed: everyone on the team and every
    // task assignee hears once, with their role and task count.
    this.eventEmitter.emit(
      STAFF_EVENTS.PROJECT_ASSIGNED,
      new ProjectAssignedEvent(project.id, createdBy),
    );
```

Do **not** emit from `applyTaskAssignments` or `addTeamMembers` — both run inside the creation transaction.

- [ ] **Step 2: `ProjectTeamService`** — add `actorUserId?: string` to `AddTeamMemberInput`, inject `private readonly eventEmitter: EventEmitter2` (from `@nestjs/event-emitter`) in the constructor, and replace `return member;` in `addMember` with:

```ts
    this.eventEmitter.emit(
      STAFF_EVENTS.PROJECT_TEAM_ADDED,
      new ProjectTeamAddedEvent(dto.projectId, dto.userId, dto.actorUserId ?? null),
    );
    return member;
```

(imports: `ProjectTeamAddedEvent, STAFF_EVENTS` from `'../../notifications/events/staff-notification.events'`).

- [ ] **Step 3: Controller** — in `project-team.controller.ts` rename `_currentUser` to `currentUser` and pass `actorUserId: currentUser.id` in the `addMember({...})` call.

- [ ] **Step 4: Verify** — `npm run typecheck:backend && npx nx run backend:lint` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/projects
git commit -m "feat(projects): notify the team when a project starts or someone joins"
```

---

### Task 5: Emit lead and follow-up assigned

**Files:**
- Modify: `apps/backend/src/modules/customers/services/customer.service.ts:766-807`
- Modify: `apps/backend/src/modules/customers/services/followup.service.ts`

- [ ] **Step 1: `CustomerService`** — inject `private readonly eventEmitter: EventEmitter2` (last constructor param). In `assignCustomer`, change `await this.findById(id);` to `const before = await this.findById(id);`, and replace the final `return updated;` with:

```ts
    if (assigneeId && assigneeId !== before.assigneeId) {
      this.eventEmitter.emit(
        STAFF_EVENTS.LEAD_ASSIGNED,
        new LeadAssignedEvent(id, assigneeId, updatedBy ?? null),
      );
    }
    return updated;
```

- [ ] **Step 2: `FollowupService`** — inject `private readonly eventEmitter: EventEmitter2`; import `FollowupAssignedEvent, FollowupsReassignedEvent, STAFF_EVENTS`. Add a helper:

```ts
  private emitAssigned(followupId: string, assigneeUserId: string, actorUserId: string): void {
    this.eventEmitter.emit(
      STAFF_EVENTS.FOLLOWUP_ASSIGNED,
      new FollowupAssignedEvent(followupId, assigneeUserId, actorUserId),
    );
  }
```

- [ ] **Step 3: `create`** — before its final `return followup;` (:82): `this.emitAssigned(followup.id, followup.assignedToUserId, createdBy);`

- [ ] **Step 4: `update`** — before `return updatedFollowup;` (:249):

```ts
    if (
      updateDto.assignedToUserId &&
      updateDto.assignedToUserId !== existingFollowup.assignedToUserId
    ) {
      this.emitAssigned(id, updateDto.assignedToUserId, updatedBy);
    }
```

(Use the DTO/param names the method already has — `existingFollowup` is read at :198.)

- [ ] **Step 5: `complete`** — the method returns the transaction promise directly (:298). Change it to:

```ts
    let nextFollowup: { id: string; assignedToUserId: string } | null = null;
    const completed = await this.followupRepository.repository.manager.transaction(
      async (manager) => {
        // … existing body unchanged, except the dto.next create becomes:
        //   nextFollowup = await this.followupRepository.create({ …same fields… }, manager);
      },
    );
    if (nextFollowup) this.emitAssigned(nextFollowup.id, nextFollowup.assignedToUserId, userId);
    return completed;
```

(`followupRepository.create` returns the saved entity; check its return type and adjust the variable type to it.)

- [ ] **Step 6: `reassign`** — replace `return updated;` with:

```ts
    if (followup.assignedToUserId !== assignedToUserId) {
      this.emitAssigned(id, assignedToUserId, userId);
    }
    return updated;
```

- [ ] **Step 7: `reassignMany`** — in the validation loop, collect ids that actually change hands:

```ts
    const moved: string[] = [];
    for (const id of ids) {
      const followup = await this.followupRepository.findById(id);
      if (followup) {
        await this.resellerContext.assertAssignableUser(assignedToUserId, followup.customerId);
        if (followup.assignedToUserId !== assignedToUserId) moved.push(id);
      }
    }
```

and before `return { updated };`:

```ts
    if (moved.length > 0) {
      this.eventEmitter.emit(
        STAFF_EVENTS.FOLLOWUPS_REASSIGNED,
        new FollowupsReassignedEvent(moved, assignedToUserId, userId),
      );
    }
```

- [ ] **Step 8: Verify** — `npm run typecheck:backend && npx nx run backend:lint` → exit 0.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/customers/services/customer.service.ts apps/backend/src/modules/customers/services/followup.service.ts
git commit -m "feat(crm): notify on lead and follow-up assigned"
```

---

### Task 6: Emit site visit / survey and ticket assigned

**Files:**
- Modify: `apps/backend/src/modules/customers/services/customer-property.service.ts:513-655`
- Modify: `apps/backend/src/modules/service-tickets/services/service-ticket.service.ts`

- [ ] **Step 1: Property `update`** (already has `eventEmitter`) — import `SiteWorkAssignedEvent, STAFF_EVENTS`; directly before `this.logger.log(\`Property updated successfully: ${id}\`);` add:

```ts
    // After the commit. `property` is the row before this save.
    const actor = updatedBy ?? null;
    if (updated.siteVisitAssignee && updated.siteVisitAssignee !== property.siteVisitAssignee) {
      this.eventEmitter.emit(
        STAFF_EVENTS.SITE_WORK_ASSIGNED,
        new SiteWorkAssignedEvent(id, 'visit', updated.siteVisitAssignee, actor),
      );
    }
    if (updated.siteSurveyAssignee && updated.siteSurveyAssignee !== property.siteSurveyAssignee) {
      this.eventEmitter.emit(
        STAFF_EVENTS.SITE_WORK_ASSIGNED,
        new SiteWorkAssignedEvent(id, 'survey', updated.siteSurveyAssignee, actor),
      );
    }
```

(The controller already passes `currentUser.id`, `customer-property.controller.ts:306`.)

- [ ] **Step 2: `ServiceTicketService`** — inject `private readonly eventEmitter: EventEmitter2`; import `STAFF_EVENTS, TicketAssignedEvent`. In `create`, change `return this.dataSource.transaction(async (manager) => {` to `const saved = await this.dataSource.transaction(async (manager) => {`, and after the transaction add:

```ts
    if (dto.assignedToEmployeeId) {
      this.eventEmitter.emit(
        STAFF_EVENTS.TICKET_ASSIGNED,
        new TicketAssignedEvent(saved.id, dto.assignedToEmployeeId, userId),
      );
    }
    return saved;
```

- [ ] **Step 3: Ticket `update`** — before `return this.findById(id);` (:190):

```ts
    if (assigneeChanged && dto.assignedToEmployeeId) {
      this.eventEmitter.emit(
        STAFF_EVENTS.TICKET_ASSIGNED,
        new TicketAssignedEvent(id, dto.assignedToEmployeeId, userId),
      );
    }
```

- [ ] **Step 4: Verify** — `npm run typecheck:backend && npx nx run backend:lint` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/customers/services/customer-property.service.ts apps/backend/src/modules/service-tickets/services/service-ticket.service.ts
git commit -m "feat(site-work,tickets): notify on site visit, survey and ticket assigned"
```

---

### Task 7: Logout turns off the phone's push

**Files:**
- Modify: `apps/backend/src/modules/users/repositories/user-device-token.repository.ts`
- Modify: `apps/backend/src/modules/users/services/device-token.service.ts`
- Create: `apps/backend/src/modules/auth/dto/logout.dto.ts`
- Modify: `apps/backend/src/modules/auth/controllers/auth.controller.ts:118-130`
- Modify: `apps/backend/src/modules/auth/services/auth.service.ts:402-405`

- [ ] **Step 1: Repository** — add:

```ts
  /** Signing out on a phone stops that phone getting this user's pushes. */
  async deactivateForUser(userId: string, token: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(UserDeviceTokenEntity)
      .set({ isActive: false })
      .where('token = :token AND user_id = :userId', { token, userId })
      .execute();
  }
```

- [ ] **Step 2: Service** — add to `DeviceTokenService`:

```ts
  async deactivateForUser(userId: string, token: string): Promise<void> {
    return this.deviceTokenRepository.deactivateForUser(userId, token);
  }
```

- [ ] **Step 3: DTO** — `auth/dto/logout.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ description: "This phone's FCM token, to stop its pushes" })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  deviceToken?: string;
}
```

Export it from `auth/dto/index.ts` if that barrel exists.

- [ ] **Step 4: Controller** — change the handler to:

```ts
  async logout(@CurrentUser() user: CurrentUserType, @Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(user.id, dto?.deviceToken);
  }
```

- [ ] **Step 5: Service** — inject `@Inject(forwardRef(() => DeviceTokenService)) private readonly deviceTokenService: DeviceTokenService` (AuthModule already imports `forwardRef(() => UsersModule)`, which exports it), and replace `logout`:

```ts
  async logout(userId: string, deviceToken?: string): Promise<void> {
    // TODO: Invalidate refresh tokens (store them in Redis/DB)
    if (deviceToken) await this.deviceTokenService.deactivateForUser(userId, deviceToken);
    this.logger.log(`User logged out: ${userId}`);
  }
```

- [ ] **Step 6: Verify** — `npm run typecheck:backend && npx nx run backend:lint` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/auth apps/backend/src/modules/users
git commit -m "feat(auth): logout stops pushes to that phone"
```

---

### Task 8: Page size cap and nightly cleanup

**Files:**
- Modify: `apps/backend/src/modules/notifications/controllers/notification.controller.ts:58-82`
- Create: `apps/backend/src/modules/notifications/services/notification-cleanup.service.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.module.ts`

- [ ] **Step 1: Cap** — in `findAll`, compute the numbers first and pass them to the service:

```ts
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const { notifications, total } = await this.notificationService.list(
      currentUser.id,
      pageNum,
      limitNum,
      String(unreadOnly) === 'true',
    );
```

and delete the later `const pageNum = page ?? 1; const limitNum = limit ?? 20;` lines.

- [ ] **Step 2: Cleanup service**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

/**
 * Keeps the notifications table from growing forever. Morning summaries are
 * only useful for a day or two; everything else is kept for six months.
 * Safe on several machines at once — a second DELETE finds nothing.
 */
@Injectable()
export class NotificationCleanupService {
  private readonly logger = new Logger(NotificationCleanupService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron('0 2 * * *', { name: 'notifications:cleanup', timeZone: 'Asia/Kolkata' })
  async purgeOld(): Promise<void> {
    try {
      const [, deleted] = (await this.dataSource.query(
        `DELETE FROM notifications
          WHERE (type = ANY($1::text[]) AND created_at < now() - interval '30 days')
             OR created_at < now() - interval '180 days'`,
        [[NotificationType.DAILY_SUMMARY, NotificationType.ADMIN_DAILY_SUMMARY]],
      )) as [unknown, number];
      this.logger.log(`Deleted ${deleted ?? 0} old notifications`);
    } catch (err) {
      this.logger.error('Notification cleanup failed', err);
    }
  }
}
```

- [ ] **Step 3: Register** `NotificationCleanupService` in `notifications.module.ts` providers.

- [ ] **Step 4: Verify** — `npm run typecheck:backend && npx nx run backend:lint` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/notifications
git commit -m "feat(notifications): cap page size, purge old rows nightly"
```

---

### Task 9: Web — shared row, "See all", `/notifications` page

**Files:**
- Modify: `apps/web/lib/hooks/resources/notifications.ts`
- Create: `apps/web/components/layout/notification-row.tsx`
- Modify: `apps/web/components/layout/notification-bell.tsx`
- Create: `apps/web/components/features/notifications/notifications-page.tsx`
- Create: `apps/web/components/features/notifications/index.ts`
- Create: `apps/web/app/(dashboard)/notifications/page.tsx`
- Modify: `apps/web/lib/rbac/route-map.ts`

- [ ] **Step 1: Hooks** — in `notifications.ts`, replace the local `Notification` interface with:

```ts
import type { NotificationItem } from '@tejas96/shared/types';

/** One row of `GET /notifications`. Unread is `readAt === null`; there is no `isRead`. */
export type Notification = NotificationItem;
```

and add a paged hook:

```ts
export interface NotificationPage {
  data: Notification[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** The full list page: 20 a page, optionally unread only. */
export function useNotificationsPage(page: number, unreadOnly: boolean) {
  return useQuery<NotificationPage>({
    queryKey: ['notifications', 'page', page, unreadOnly],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationPage>('/notifications', {
        params: { page, limit: 20, unreadOnly },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
```

- [ ] **Step 2: Row + open logic** — create `components/layout/notification-row.tsx`. Move `isWebLink` and the item markup out of the bell into it (one home for both bell and page):

```tsx
'use client';

import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { Box, ButtonBase } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useCallback } from 'react';

import { type Notification, useNotificationActions } from '@/lib/hooks/resources/notifications';
import { useRefreshMoneyViews } from '@/lib/hooks/resources/payment-approvals';
import { color, crm } from '@/lib/theme/tokens';
import { formatTimeAgo } from '@/lib/utils';

/**
 * A link this web app can open. Customer notifications carry `/consumer/...`
 * links for the customer app — a few staff are customers too, and pushing
 * them to a route the web does not have would land on "not found".
 */
export function isWebLink(link: string | null | undefined): link is string {
  return (
    Boolean(link) &&
    link!.startsWith('/') &&
    !link!.startsWith('//') &&
    !link!.startsWith('/consumer/')
  );
}

const ICONS: Record<string, SvgIconComponent> = {
  task_assigned: AssignmentOutlined,
  task_blocked: BlockOutlined,
  project_assigned: FolderOutlined,
  project_team_added: FolderOutlined,
  lead_assigned: PersonAddAltOutlined,
  followup_assigned: EventOutlined,
  site_visit_assigned: PlaceOutlined,
  site_survey_assigned: PlaceOutlined,
  service_ticket_assigned: BuildOutlined,
  daily_summary: WbSunnyOutlined,
  admin_daily_summary: InsightsOutlined,
  payment_approval_pending: PaymentsOutlined,
  payment_approved: PaymentsOutlined,
  payment_rejected: PaymentsOutlined,
};

/**
 * Clicking a notification marks it read and opens what it points at, in one
 * action. Shared by the bell and the full list so both behave the same.
 */
export function useOpenNotification(onOpened?: () => void): (item: Notification) => void {
  const router = useRouter();
  const { markRead } = useNotificationActions();
  const refreshMoney = useRefreshMoneyViews();
  return useCallback(
    (item: Notification) => {
      if (!item.readAt) markRead.mutate(item.id);
      // The page this opens must show what the notice describes, even when the
      // notice arrived before the badge's last poll noticed it.
      if (item.type.startsWith('payment_')) refreshMoney();
      onOpened?.();
      if (isWebLink(item.link)) router.push(item.link);
    },
    [markRead, refreshMoney, onOpened, router],
  );
}

export function NotificationRow({
  item,
  onOpen,
}: {
  item: Notification;
  onOpen: (item: Notification) => void;
}): JSX.Element {
  const Icon = ICONS[item.type] ?? NotificationsNoneOutlined;
  const unread = !item.readAt;
  return (
    <Box component="li" sx={{ borderBottom: `1px solid ${color.divider}` }}>
      <ButtonBase
        onClick={() => onOpen(item)}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
          px: 2,
          py: 1.25,
          textAlign: 'left',
        }}
      >
        <Icon
          aria-hidden
          sx={{
            mt: '2px',
            fontSize: 18,
            flexShrink: 0,
            color: unread ? color.accent : color['text-tertiary'],
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              fontSize: crm['text-row-title'],
              fontWeight: unread ? 700 : 500,
              color: item.severity === 'warning' && unread ? color.danger : undefined,
            }}
          >
            {unread ? <span className="sr-only">Unread: </span> : null}
            {item.title}
          </Box>
          {item.body ? (
            <Box
              sx={{
                mt: 0.25,
                fontSize: crm['text-row-sm'],
                color: color['text-secondary'],
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.body}
            </Box>
          ) : null}
          <Box sx={{ mt: 0.5, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {formatTimeAgo(item.createdAt)}
          </Box>
        </Box>
      </ButtonBase>
    </Box>
  );
}
```

The unread dot is replaced by the coloured icon (accent = unread). One signal, not two.

- [ ] **Step 3: Bell** — in `notification-bell.tsx`:
  - delete `isWebLink`, the local `openItem`, and the item markup inside `items.map(...)`;
  - `const openItem = useOpenNotification(() => setAnchor(null));` and render `items.map((item) => <NotificationRow key={item.id} item={item} onOpen={openItem} />)`;
  - keep the badge, the `refreshMoney` on count-increase effect, "Mark all read" and `EmptyLine`;
  - after the `<Box component="ul">…</Box>`, add a footer:

```tsx
        <ButtonBase
          onClick={() => {
            setAnchor(null);
            router.push('/notifications');
          }}
          sx={{
            width: '100%',
            py: 1,
            fontSize: crm['text-row-sm'],
            fontWeight: 600,
            color: color.accent,
            borderTop: `1px solid ${color.divider}`,
          }}
        >
          See all
        </ButtonBase>
```

- [ ] **Step 4: Page component** — `components/features/notifications/notifications-page.tsx`:

```tsx
'use client';

import { Box, ButtonBase, Pagination, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { type JSX, useState } from 'react';

import { NotificationRow, useOpenNotification } from '@/components/layout/notification-row';
import {
  useNotificationActions,
  useNotificationsPage,
} from '@/lib/hooks/resources/notifications';
import { color, crm, radius } from '@/lib/theme/tokens';

/** Every notification, newest first — the bell only shows the last ten. */
export function NotificationsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotificationsPage(page, unreadOnly);
  const { markAllRead } = useNotificationActions();
  const openItem = useOpenNotification();

  const items = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box component="h1" sx={{ m: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          Notifications
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={unreadOnly ? 'unread' : 'all'}
          onChange={(_, v: 'all' | 'unread' | null) => {
            if (!v) return;
            setUnreadOnly(v === 'unread');
            setPage(1);
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
        </ToggleButtonGroup>
        <ButtonBase
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          sx={{ fontSize: crm['text-row-sm'], fontWeight: 600, color: color.accent, px: 1 }}
        >
          Mark all read
        </ButtonBase>
      </Box>

      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          border: `1px solid ${color.divider}`,
          borderRadius: radius['card-functional'],
          overflow: 'hidden',
        }}
      >
        {query.isLoading ? (
          <Line text="Loading…" />
        ) : query.isError ? (
          <Line text="Could not load notifications. Try again." />
        ) : items.length === 0 ? (
          <Line text={unreadOnly ? 'No unread notifications.' : 'Nothing here yet.'} />
        ) : (
          items.map((item) => <NotificationRow key={item.id} item={item} onOpen={openItem} />)
        )}
      </Box>

      {totalPages > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      ) : null}
    </Box>
  );
}

function Line({ text }: { text: string }): JSX.Element {
  return (
    <Box component="li" sx={{ px: 2, py: 3, color: color['text-secondary'], textAlign: 'center' }}>
      {text}
    </Box>
  );
}
```

`components/features/notifications/index.ts`: `export { NotificationsPage } from './notifications-page';`

- [ ] **Step 5: Route** — `app/(dashboard)/notifications/page.tsx`:

```tsx
import type { JSX } from 'react';

import { NotificationsPage } from '@/components/features/notifications';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function NotificationsRoute(): JSX.Element {
  return <NotificationsPage />;
}
```

- [ ] **Step 6: Gate** — in `lib/rbac/route-map.ts`, in the "Always open" block after the `/denied` line, add:

```ts
  // Your own notifications, addressed to you alone.
  { pattern: /^\/notifications(\/|$)/, gate: ALWAYS_OPEN },
```

- [ ] **Step 7: Verify** — `npm run typecheck:web && npx nx run web:lint` → exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): notification icons, See all, and a full notifications page"
```

---

### Task 10: Check it through the UI, then open the PR

**No code.** Follow the house rules: use the screens, not API calls or SQL, to show it works ([[verify-the-feature-not-the-row]], [[demo-through-the-ui-only]]). SQL is allowed only to *find* a second test user.

- [ ] **Step 1: Servers** — `lsof -nP -iTCP -sTCP:LISTEN | grep -E '3001|8085'`. Restart the backend so the new listener loads (it is not hot-reloaded); restart the web dev server before trusting any console error.

- [ ] **Step 2: Two users** — user A = the local QA login (memory `local-test-login`); user B = another active staff user who is on a project team. Open B's session in a second browser tab (cookies do not cross ports — sign in on 3001 in that tab).

- [ ] **Step 3: Walk each event as A, check B's bell and `/notifications`:**
  1. Assign a task to B on a project → "New task".
  2. Move a task on a project where B is PM to Blocked → B gets "Task blocked" (warning colour).
  3. Add B to a project team → "Added to project … as <role>".
  4. Assign a lead to B → "New lead".
  5. Create a follow-up for B; reassign one to B; bulk-reassign 2 to B → single, single, one "2 follow-ups".
  6. Set B as site visit and site survey assignee on a property → two notifications.
  7. Assign a service ticket to B → "Ticket <number>".
  8. Convert an accepted quote with B as PM and 2+ tasks on B → exactly **one** notification for B ("… as Project Manager · N tasks").
  Click each one → it opens the right page (follow-up opens the property/customer page with that follow-up open; task opens the project's Tasks tab).

- [ ] **Step 4: Skip rules** — as A: assign a task to A itself → nothing for A. Clear a task's assignee → nothing. Reassign a completed follow-up to B → nothing.

- [ ] **Step 5: Page** — `/notifications`: All/Unread toggle, Mark all read, pagination (if >20). Bell "See all" opens it. Badge drops after reading.

- [ ] **Step 6: Logout token** — nothing to see on web; confirm `POST /auth/logout` still returns 204 from the web sign-out (network tab).

- [ ] **Step 7: Full checks** — `npm run typecheck && npm run lint` → exit 0.

- [ ] **Step 8: Push and open the PR** (ask the user before pushing):

```bash
git push -u origin feat/staff-notifications
gh pr create --title "Staff notifications, part 1: instant 'assigned to you' events" --body-file <(cat <<'EOF'
## What

Staff now hear the moment work becomes theirs: task assigned/blocked, project start, team added, lead, follow-up, site visit/survey, service ticket. Web gets icons, "See all" and a `/notifications` page. Logout can turn off a phone's push.

Spec: `docs/superpowers/specs/2026-10-06-staff-notifications-design.md`
Plan: `docs/superpowers/plans/2026-10-06-staff-notifications-pr1.md`

## Before / after deploy
- Phone push needs the Firebase secrets on `oneohm-epc-backend` (see spec, "Steps for the owner"). Setting them also turns on push for the consumer app.
- The mobile PR follows once this merges and the shared package is published.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```
