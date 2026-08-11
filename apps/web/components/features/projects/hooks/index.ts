export { projectKeys, useProjects } from './use-projects';
export type {
  PaymentSummary,
  ProjectFilters,
  ProjectListItem,
  ProjectListResponse,
  TeamMemberSummary,
} from './use-projects';

export { employeeKeys, useEmployees } from './use-employees';
export type { EmployeeListItem } from './use-employees';

export { workloadKeys, useTeamWorkload } from './use-team-workload';
export type { TeamWorkloadItem } from './use-team-workload';

export { useConvertFromQuote } from './use-create-project';
export type { ConvertFromQuotePayload } from './use-create-project';

export { myTaskKeys, useMyTasks, useMyTasksGroupTasks, useUpdateTaskStatus } from './use-my-tasks';
export type {
  GroupByMode,
  GroupedMyTasksResponse,
  MyTask,
  MyTaskFilters,
  MyTaskListItem,
  MyTasksGroup,
  MyTasksGroupTasksResponse,
  MyTasksProject,
  MyTasksSummary,
} from './use-my-tasks';

export { useCollapsedGroups } from './use-collapsed-groups';
export { useTaskKeyboardNav } from './use-task-keyboard-nav';

export {
  projectDetailKeys,
  useProject,
  useProjectTeam,
  useProjectTaskStats,
  useProjectTasks,
} from './use-project-detail';

// FDAL resource hooks — re-exported for feature consumers
export {
  useProjectTaskList,
  type ProjectTaskItem,
  type ProjectTaskListParams,
} from '@/lib/hooks/resources';

export { paymentKeys, usePaymentMilestones, useProjectMilestones } from './use-project-payments';
export { projectAttentionKeys, useProjectAttention } from './use-project-attention';
export { projectReportKeys, useProjectReports } from './use-project-reports';
export type { ProjectReportsData } from './use-project-reports';

export { useDocumentDownload } from './use-document-download';
export { useCreateProjectTask, type CreateProjectTaskPayload } from './use-create-project-task';

export { useUpdateProjectStatus } from './use-update-project-status';
export { useEditProject, useProjectMemberTasks } from './use-edit-project';
export type {
  UpdateProjectPayload,
  AddTeamMemberPayload,
  UpdateTeamMemberPayload,
  RemoveTeamMemberPayload,
  ReassignTaskPayload,
  UseEditProjectReturn,
} from './use-edit-project';

export {
  useProjectTaskStatuses,
  type UseProjectTaskStatusesResult,
} from './use-project-task-statuses';

export {
  useProjectTaskBoard,
  type KanbanColumnData,
  type UseProjectTaskBoardResult,
} from './use-project-task-board';

export {
  useTaskBoardDnd,
  isDraggableTaskData,
  isDroppableColumnData,
  BOARD_DND_TASK_TYPE,
  type DragState,
  type DraggableTaskData,
  type DroppableColumnData,
  type UseTaskBoardDndResult,
} from './use-task-board-dnd';

export type {
  MilestoneAggregateItem,
  MilestoneWithPayment,
  ProjectDetail,
  ProjectDetailProperty,
  ProjectMaterial,
  ProjectTeamMember,
  TaskStatsSummary,
} from './types';

export { useProjectChatMessages, useSendProjectChatMessage } from './use-project-chat';
export type { ProjectChatMessage } from './use-project-chat';
