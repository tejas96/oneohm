export { projectKeys, useProjects } from './use-projects';
export type { ProjectFilters, ProjectListItem, TeamMemberSummary } from './use-projects';

export { useEmployees } from './use-employees';
export type { EmployeeListItem } from './use-employees';

export { myTaskKeys, useMyTasks, useMyTasksGroupTasks, useUpdateTaskStatus } from './use-my-tasks';
export type { GroupByMode, MyTaskFilters } from './use-my-tasks';

export { projectDetailKeys, useProjectTeam, useProjectTasks } from './use-project-detail';

// FDAL resource hooks — re-exported for feature consumers
export { useProjectTaskList, type ProjectTaskItem } from '@/lib/hooks/resources';

export { useProjectMilestones } from './use-project-payments';
export { useProjectReports } from './use-project-reports';
export { useUpdateProjectStatus } from './use-update-project-status';
export {
  useCancelProject,
  useCancellationCleanup,
  useSettlementPreview,
} from './use-project-cancellation';
export type { CancelProjectSettlement } from './use-project-cancellation';
export { useProjectTaskBoard, type KanbanColumnData } from './use-project-task-board';

export { useTaskBoardDnd } from './use-task-board-dnd';

export type { ProjectTeamMember } from './types';

export { useProjectChatMessages, useSendProjectChatMessage } from './use-project-chat';
