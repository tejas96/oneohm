import { Injectable } from '@nestjs/common';
import {
  type AttentionItem,
  type AttentionSeverity,
  MaterialStatus,
  PaymentTransactionStatus,
  TaskStatus,
} from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

import { PaymentEntity } from '../../payments/entities';
import type { AttentionResponseDto } from '../dto/attention-response.dto';
import { MaterialRepository } from '../repositories/material.repository';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectRepository } from '../repositories/project.repository';

const ATTENTION_SERVICE_CONSTANTS = {
  UPCOMING_DAYS: 7,
  MILESTONE_DUE_SOON_DAYS: 3,
  MAX_ITEMS: 10,
  PAYMENT_SAMPLE_SIZE: 2,
  MATERIAL_SAMPLE_SIZE: 2,
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
    private readonly materialRepository: MaterialRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getProjectAttention(
    projectId: string,
    organizationId: string,
  ): Promise<AttentionResponseDto[]> {
    // Ownership validation first to guarantee org isolation for all downstream queries.
    await this.projectRepository.findById(projectId, organizationId);

    const [tasks, materials, payments] = await Promise.all([
      this.projectTaskRepository.findAllForBoard(projectId),
      this.materialRepository.findByProject(projectId),
      this.findPendingPayments(projectId, organizationId),
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
      const isOverdue =
        !!dueDate &&
        dueDate < now &&
        task.status !== TaskStatus.DONE &&
        task.status !== TaskStatus.CANCELLED;

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
    const terminalStatuses = new Set([TaskStatus.DONE, TaskStatus.CANCELLED]);

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

    // ── Material pending alerts ────────────────────────────────────────────
    const pendingMaterials = materials
      .filter(
        (material) => ![MaterialStatus.ALLOCATED, MaterialStatus.USED].includes(material.status),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, ATTENTION_SERVICE_CONSTANTS.MATERIAL_SAMPLE_SIZE);

    for (const material of pendingMaterials) {
      items.push({
        id: `material:${material.id}:pending`,
        kind: 'material_pending',
        severity: 'warning',
        title: `${material.materialName} is pending`,
        subtitle: `Status: ${material.status.replace(/_/g, ' ')}`,
        href: `/projects/${projectId}?tab=bom`,
      });
    }

    // ── Payment due alerts ────────────────────────────────────────────────
    for (const payment of payments.slice(0, ATTENTION_SERVICE_CONSTANTS.PAYMENT_SAMPLE_SIZE)) {
      const pendingAmount = Math.max(
        0,
        Number(payment.expectedAmount) - Number(payment.paidAmount),
      );
      if (pendingAmount <= 0) continue;
      items.push({
        id: `payment:${payment.id}:due`,
        kind: 'payment_due',
        severity: 'warning',
        title: `Payment ${payment.paymentNumber} is pending`,
        subtitle: `${this.formatInr(pendingAmount)} due`,
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

  private async findPendingPayments(
    projectId: string,
    organizationId: string,
  ): Promise<PaymentEntity[]> {
    return this.dataSource
      .getRepository(PaymentEntity)
      .createQueryBuilder('payment')
      .where('payment.projectId = :projectId', { projectId })
      .andWhere('payment.organizationId = :organizationId', { organizationId })
      .andWhere('payment.deletedAt IS NULL')
      .andWhere('payment.status IN (:...statuses)', {
        statuses: [PaymentTransactionStatus.PENDING, PaymentTransactionStatus.RECEIVED],
      })
      .andWhere('payment.expectedAmount > payment.paidAmount')
      .orderBy('payment.createdAt', 'ASC')
      .getMany();
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
