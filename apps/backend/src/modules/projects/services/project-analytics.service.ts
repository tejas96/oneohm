import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@oneohm-epc/shared/types';
import { In } from 'typeorm';

import { UserRepository } from '../../users/repositories/user.repository';
import {
  ActivityFeedItemDto,
  MilestoneProgressEntryDto,
  ProjectSummaryMetricsDto,
  ProjectSummaryResponseDto,
  TeamWorkloadEntryDto,
} from '../dto/analytics';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectRepository } from '../repositories/project.repository';

const UPCOMING_DEADLINE_DAYS = 7;
const MAX_UPCOMING_DEADLINES = 5;
const MAX_ACTIVITY_ENTRIES = 20;
const UNASSIGNED_PLACEHOLDER_ID = '';
const UNASSIGNED_PLACEHOLDER_NAME = 'Unassigned';

@Injectable()
export class ProjectAnalyticsService {
  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async getProjectSummary(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectSummaryResponseDto> {
    const [project, allTasks] = await Promise.all([
      this.projectRepository.findById(projectId, organizationId),
      this.taskRepository.findAllForBoard(projectId),
    ]);

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const now = new Date();
    const upcomingCutoff = new Date(now.getTime() + UPCOMING_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    const terminalStatuses = new Set([TaskStatus.DONE, TaskStatus.CANCELLED]);

    // ── Aggregations by status and priority ─────────────────────────────────
    const tasksByStatus: Record<string, number> = {};
    const tasksByPriority: Record<string, number> = {};

    for (const task of allTasks) {
      tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] ?? 0) + 1;
    }

    // ── Scalar metrics ───────────────────────────────────────────────────────
    const completedTasks = tasksByStatus[TaskStatus.DONE] ?? 0;
    const inProgressTasks = tasksByStatus[TaskStatus.IN_PROGRESS] ?? 0;
    const blockedTasks = tasksByStatus[TaskStatus.BLOCKED] ?? 0;

    const overdueTasks = allTasks.filter(
      (t) =>
        t.endDate !== null &&
        t.endDate !== undefined &&
        new Date(t.endDate) < now &&
        !terminalStatuses.has(t.status),
    ).length;

    const unassignedTasks = allTasks.filter((t) => !t.assignedToUserId).length;

    const upcomingDeadlines = allTasks
      .filter(
        (t) =>
          t.endDate !== null &&
          t.endDate !== undefined &&
          new Date(t.endDate) >= now &&
          new Date(t.endDate) <= upcomingCutoff &&
          !terminalStatuses.has(t.status),
      )
      .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
      .slice(0, MAX_UPCOMING_DEADLINES)
      .map((t) => ({
        id: t.id,
        name: t.name ?? t.code,
        endDate: new Date(t.endDate!).toISOString(),
      }));

    const metrics: ProjectSummaryMetricsDto = {
      totalTasks: allTasks.length,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      blockedTasks,
      unassignedTasks,
      completionPercentage: project.progressPercentage,
      upcomingDeadlines,
    };

    // ── Recent activity feed ─────────────────────────────────────────────────
    const flatActivity: (ActivityFeedItemDto & { _ts: number })[] = [];

    for (const task of allTasks) {
      const log = task.activityLog ?? [];
      for (const entry of log) {
        flatActivity.push({
          taskId: task.id,
          taskCode: task.code,
          taskName: task.name ?? task.code,
          activityType: entry.activityType,
          fieldName: entry.fieldName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          userId: entry.userId,
          createdAt: entry.createdAt,
          _ts: new Date(entry.createdAt).getTime(),
        });
      }
    }

    flatActivity.sort((a, b) => b._ts - a._ts);
    const top20Activity = flatActivity.slice(0, MAX_ACTIVITY_ENTRIES);

    // Batch-fetch user names for activity entries
    const uniqueUserIds = [
      ...new Set(top20Activity.filter((e) => !!e.userId).map((e) => e.userId!)),
    ];

    const userMap = new Map<string, string>();
    if (uniqueUserIds.length > 0) {
      const users = await this.userRepository.repository.findBy({ id: In(uniqueUserIds) });
      for (const u of users) {
        userMap.set(u.id, `${u.firstName} ${u.lastName ?? ''}`.trim());
      }
    }

    const recentActivity: ActivityFeedItemDto[] = top20Activity.map(
      ({ _ts: _ignored, ...entry }) => ({
        ...entry,
        userName: entry.userId ? (userMap.get(entry.userId) ?? 'Unknown User') : undefined,
      }),
    );

    // ── Team workload ────────────────────────────────────────────────────────
    const workloadMap = new Map<string | null, typeof allTasks>();
    for (const task of allTasks) {
      const key = task.assignedToUserId ?? null;
      if (!workloadMap.has(key)) workloadMap.set(key, []);
      workloadMap.get(key)!.push(task);
    }

    const totalTaskCount = allTasks.length;

    const teamWorkload: TeamWorkloadEntryDto[] = [];

    // Unassigned row first
    const unassignedTasks2 = workloadMap.get(null) ?? [];
    if (unassignedTasks2.length > 0) {
      const tasksByStatusEntry: Record<string, number> = {};
      for (const t of unassignedTasks2) {
        tasksByStatusEntry[t.status] = (tasksByStatusEntry[t.status] ?? 0) + 1;
      }
      teamWorkload.push({
        userId: UNASSIGNED_PLACEHOLDER_ID,
        userName: UNASSIGNED_PLACEHOLDER_NAME,
        tasksByStatus: tasksByStatusEntry,
        totalTasks: unassignedTasks2.length,
        completedTasks: unassignedTasks2.filter((t) => t.status === TaskStatus.DONE).length,
        workloadPercent:
          totalTaskCount > 0
            ? Math.round((unassignedTasks2.length / totalTaskCount) * 1000) / 10
            : 0,
      });
    }

    // Assigned members, sorted by totalTasks DESC
    const assignedEntries: TeamWorkloadEntryDto[] = [];
    for (const [userId, tasks] of workloadMap.entries()) {
      if (userId === null) continue;
      const firstTask = tasks.find((t) => t.assignee);
      const userName = firstTask?.assignee
        ? `${firstTask.assignee.firstName} ${firstTask.assignee.lastName ?? ''}`.trim()
        : (userMap.get(userId) ?? 'Unknown User');

      const tasksByStatusEntry: Record<string, number> = {};
      for (const t of tasks) {
        tasksByStatusEntry[t.status] = (tasksByStatusEntry[t.status] ?? 0) + 1;
      }

      assignedEntries.push({
        userId,
        userName,
        tasksByStatus: tasksByStatusEntry,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
        workloadPercent:
          totalTaskCount > 0 ? Math.round((tasks.length / totalTaskCount) * 1000) / 10 : 0,
      });
    }

    assignedEntries.sort((a, b) => b.totalTasks - a.totalTasks);
    teamWorkload.push(...assignedEntries);

    // ── Milestone progress ───────────────────────────────────────────────────
    const milestoneMap = new Map<string, { name: string; tasks: typeof allTasks }>();
    for (const task of allTasks) {
      if (!task.milestoneId || !task.milestone) continue;
      if (!milestoneMap.has(task.milestoneId)) {
        milestoneMap.set(task.milestoneId, {
          name: task.milestone.name,
          tasks: [],
        });
      }
      milestoneMap.get(task.milestoneId)!.tasks.push(task);
    }

    const milestoneProgress: MilestoneProgressEntryDto[] = [];
    for (const [id, { name, tasks }] of milestoneMap.entries()) {
      const completedCount = tasks.filter((t) => t.status === TaskStatus.DONE).length;
      milestoneProgress.push({
        id,
        name,
        totalTasks: tasks.length,
        completedTasks: completedCount,
        percent: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 1000) / 10 : 0,
      });
    }

    return {
      metrics,
      tasksByStatus,
      tasksByPriority,
      recentActivity,
      teamWorkload,
      milestoneProgress,
    };
  }
}
