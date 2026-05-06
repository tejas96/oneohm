// Record<string, number> keys are fully dynamic — never hardcoded to enum values.
// Frontend receives whatever status/priority codes actually exist on the project's tasks.

export class UpcomingDeadlineDto {
  id!: string;
  name!: string;
  endDate!: string; // ISO string
}

export class ProjectSummaryMetricsDto {
  totalTasks!: number;
  completedTasks!: number;
  inProgressTasks!: number;
  overdueTasks!: number;
  blockedTasks!: number;
  unassignedTasks!: number;
  completionPercentage!: number;
  upcomingDeadlines!: UpcomingDeadlineDto[];
}

export class ActivityFeedItemDto {
  taskId!: string;
  taskCode!: string;
  taskName!: string;
  activityType!: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  userName?: string;
  createdAt!: string;
}

export class TeamWorkloadEntryDto {
  userId!: string;
  userName!: string;
  tasksByStatus!: Record<string, number>;
  totalTasks!: number;
  completedTasks!: number;
  workloadPercent!: number;
}

export class MilestoneProgressEntryDto {
  name!: string;
  order!: number;
  totalTasks!: number;
  completedTasks!: number;
  inProgressTasks!: number;
  blockedTasks!: number;
  percent!: number;
}

export class ProjectSummaryResponseDto {
  metrics!: ProjectSummaryMetricsDto;
  tasksByStatus!: Record<string, number>;
  tasksByPriority!: Record<string, number>;
  recentActivity!: ActivityFeedItemDto[];
  teamWorkload!: TeamWorkloadEntryDto[];
  milestoneProgress!: MilestoneProgressEntryDto[];
}
