import { Injectable } from '@nestjs/common';
import {
  type AttentionItem,
  type AttentionSeverity,
  TaskStatus,
} from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import type { AttentionResponseDto } from '../dto/attention-response.dto';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectRepository } from '../repositories/project.repository';

/** A row of `v_milestone_balance`, narrowed to what the alert needs. */
interface OutstandingMilestone {
  milestoneId: string;
  name: string;
  balancePaise: number;
  daysOverdue: number;
  derivedStatus: string;
}

const ATTENTION_SERVICE_CONSTANTS = {
  UPCOMING_DAYS: 7,
  MILESTONE_DUE_SOON_DAYS: 3,
  MAX_ITEMS: 10,
  PAYMENT_SAMPLE_SIZE: 2,
  /**
   * Below one rupee is not a debt, it is rounding residue.
   *
   * A payment schedule splits a contract by PERCENTAGE, so the last milestone
   * regularly lands a few paise away from the total. One real project carried a
   * balance of 24 paise and raised a `WARNING · PAYMENT` reading "₹0 short" —
   * because the amount is formatted with no decimal places, which is right for
   * every figure a person would act on and turns this one into a nought.
   *
   * Four milestones on record are under a rupee. Nobody is chasing them, and a
   * warning nobody can act on teaches people to stop reading the section it
   * sits in.
   *
   * ONE RUPEE IS THE LINE BECAUSE IT IS THE SMALLEST AMOUNT THIS UI CAN STATE.
   * Anything below it cannot be shown truthfully at all, so the choice is
   * between saying nothing and saying something false. Higher floors — "ignore
   * under ₹100" — are a business judgement about what is worth chasing, and
   * this is not the place to make one: eleven milestones sit between ₹1 and
   * ₹100 and they are all reported honestly.
   */
  MIN_OUTSTANDING_PAISE: 100,
} as const;

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class ProjectAttentionService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectTaskRepository: ProjectTaskRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getProjectAttention(projectId: string): Promise<AttentionResponseDto[]> {
    // Ownership validation first to guarantee org isolation for all downstream queries.
    await this.projectRepository.findById(projectId);

    const [tasks, outstanding] = await Promise.all([
      this.projectTaskRepository.findAllForBoard(projectId),
      this.findOutstandingMilestones(projectId),
    ]);

    const now = new Date();
    const milestoneDueSoonCutoff = new Date(
      now.getTime() + ATTENTION_SERVICE_CONSTANTS.MILESTONE_DUE_SOON_DAYS * 24 * 60 * 60 * 1000,
    );

    const items: AttentionItem[] = [];

    // ── Per-task alerts (blocked / overdue) ────────────────────────────────
    for (const task of tasks) {
      const taskName = task.name ?? task.code;
      const assigneeName = task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName ?? ''}`.trim()
        : undefined;
      const dueDate = task.endDate ? new Date(task.endDate) : undefined;
      const isBlocked = task.status === TaskStatus.BLOCKED;
      const isOverdue = !!dueDate && dueDate < now && task.status !== TaskStatus.DONE;

      if (!isBlocked && !isOverdue) continue;

      if (isBlocked) {
        items.push({
          id: `task:${task.id}:blocked`,
          kind: 'task_blocked',
          severity: 'critical',
          title: `${task.code}: ${taskName} is blocked`,
          subtitle: task.blockedReason
            ? task.blockedReason
            : assigneeName
              ? `Assigned to ${assigneeName}`
              : 'Unassigned task requires intervention',
          href: this.buildTaskHref(projectId, task.code),
          dueDate: dueDate?.toISOString(),
          assigneeName,
        });
        continue;
      }

      if (!dueDate) continue;
      const overdueDays = Math.max(
        1,
        Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)),
      );
      items.push({
        id: `task:${task.id}:overdue`,
        kind: 'task_overdue',
        severity: overdueDays >= 3 ? 'critical' : 'warning',
        title: `${task.code}: ${taskName} is overdue`,
        subtitle: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue${
          assigneeName ? ` - assigned to ${assigneeName}` : ''
        }`,
        href: this.buildTaskHref(projectId, task.code),
        dueDate: dueDate.toISOString(),
        assigneeName,
      });
    }

    // ── Milestone alerts (derived from task due dates grouped by milestone_name) ─
    const milestoneEndDateMap = new Map<string, Date>();
    const terminalStatuses = new Set([TaskStatus.DONE]);

    for (const task of tasks) {
      if (!task.milestoneName) continue;
      if (terminalStatuses.has(task.status)) continue;
      if (!task.endDate) continue;

      const taskEndDate = new Date(task.endDate);
      const existing = milestoneEndDateMap.get(task.milestoneName);
      if (!existing || taskEndDate > existing) {
        milestoneEndDateMap.set(task.milestoneName, taskEndDate);
      }
    }

    for (const [milestoneName, endDate] of milestoneEndDateMap.entries()) {
      const slug = slugify(milestoneName);

      if (endDate < now) {
        const overdueDays = Math.max(
          1,
          Math.floor((now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000)),
        );
        items.push({
          id: `milestone:${slug}:late`,
          kind: 'milestone_late',
          severity: overdueDays >= 3 ? 'critical' : 'warning',
          title: `${milestoneName} milestone is late`,
          subtitle: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
          href: this.buildMilestoneTasksHref(projectId, milestoneName),
          dueDate: endDate.toISOString(),
        });
        continue;
      }

      if (endDate <= milestoneDueSoonCutoff) {
        const dueInDays = Math.max(
          1,
          Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        );
        items.push({
          id: `milestone:${slug}:due_soon`,
          kind: 'milestone_due_soon',
          severity: 'info',
          title: `${milestoneName} milestone is due soon`,
          subtitle: `Due in ${dueInDays} day${dueInDays === 1 ? '' : 's'}`,
          href: this.buildMilestoneTasksHref(projectId, milestoneName),
          dueDate: endDate.toISOString(),
        });
      }
    }

    // ── Outstanding milestone alerts ──────────────────────────────────────
    // Previously this scanned `payments` for `expected_amount > paid_amount`.
    // That compared a receipt against a plan figure duplicated onto every
    // receipt of a milestone, so two ₹25k receipts against one ₹50k milestone
    // each looked ₹25k short. Outstanding is a property of the MILESTONE, and
    // `v_milestone_balance` is the single place it is defined.
    for (const milestone of outstanding.slice(0, ATTENTION_SERVICE_CONSTANTS.PAYMENT_SAMPLE_SIZE)) {
      items.push({
        id: `milestone:${milestone.milestoneId}:due`,
        kind: 'payment_due',
        severity: milestone.daysOverdue > 0 ? 'critical' : 'warning',
        title: `${milestone.name} is ${milestone.derivedStatus}`,
        subtitle:
          milestone.daysOverdue > 0
            ? `${this.formatInr(milestone.balancePaise / 100)} short · ${milestone.daysOverdue} days overdue`
            : `${this.formatInr(milestone.balancePaise / 100)} short`,
        href: `/projects/${projectId}?tab=payments`,
      });
    }

    return items
      .sort((a, b) => {
        const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (severityDelta !== 0) return severityDelta;
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      })
      .slice(0, ATTENTION_SERVICE_CONSTANTS.MAX_ITEMS);
  }

  /**
   * Milestones with money still owed, worst first.
   *
   * Waived milestones are excluded by the view's `status` filter, so a waived
   * residual no longer nags forever — the contradiction where the finance
   * dashboard dropped a waived amount while the project card kept reporting it.
   *
   * Sub-rupee balances are excluded too. See `MIN_OUTSTANDING_PAISE`.
   */
  private async findOutstandingMilestones(projectId: string): Promise<OutstandingMilestone[]> {
    return this.dataSource.query(
      `SELECT
         milestone_id   AS "milestoneId",
         name,
         balance_paise  AS "balancePaise",
         days_overdue   AS "daysOverdue",
         derived_status AS "derivedStatus"
       FROM v_milestone_balance
       WHERE project_id = $1
         AND status = 'active'
         AND balance_paise >= $2
       ORDER BY days_overdue DESC, display_order ASC`,
      [projectId, ATTENTION_SERVICE_CONSTANTS.MIN_OUTSTANDING_PAISE],
    );
  }

  private buildTaskHref(projectId: string, taskCode: string): string {
    const params = new URLSearchParams({
      tab: 'tasks',
      t_search: taskCode,
    });
    return `/projects/${projectId}?${params.toString()}`;
  }

  private buildMilestoneTasksHref(projectId: string, milestoneName: string): string {
    const params = new URLSearchParams({
      tab: 'tasks',
      t_milestone: milestoneName,
    });
    return `/projects/${projectId}?${params.toString()}`;
  }

  private formatInr(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
