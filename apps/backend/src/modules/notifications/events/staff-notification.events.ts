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
