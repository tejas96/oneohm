'use client';

import type { ProjectPriority } from '@tejas96/shared/types';

export interface ConvertFromQuotePayload {
  name?: string;
  description?: string;
  projectManagerId?: string;
  teamMembers?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
  startDate?: string;
  endDate?: string;
  priority?: ProjectPriority;
  excludedStepIds?: string[];
  taskAssignments?: Array<{ workflowStepId: string; assignedToUserId: string }>;
  taskMilestoneOverrides?: Array<{
    workflowStepId: string;
    milestoneName: string | null;
    milestoneOrder: number | null;
  }>;
  milestones?: Array<{ name: string; order: number }>;
}
