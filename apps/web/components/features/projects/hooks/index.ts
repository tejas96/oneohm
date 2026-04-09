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

export { myTaskKeys, useMyTasks, useUpdateTaskStatus } from './use-my-tasks';
export type {
  GroupByMode,
  GroupedMyTasksResponse,
  MyTask,
  MyTaskFilters,
  MyTasksGroup,
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

export {
  paymentKeys,
  useProjectPayments,
  useProjectPaymentSummary,
  usePaymentMilestones,
} from './use-project-payments';

export { useDocumentDownload } from './use-document-download';

export {
  useProjectTaskStatuses,
  type UseProjectTaskStatusesResult,
} from './use-project-task-statuses';

export type {
  MilestoneWithPayment,
  PaymentSummaryDetail,
  ProjectDetail,
  ProjectDetailProperty,
  ProjectMaterial,
  ProjectMilestone,
  ProjectPayment,
  ProjectTeamMember,
  TaskStatsSummary,
} from './types';
