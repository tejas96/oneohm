'use client';

import { isProjectBaselineStep } from '@tejas96/shared/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  useAllActiveWorkflowSteps,
  useConvertFromQuote,
  useEmployees,
} from '@/lib/hooks/resources';

// ── Types ──────────────────────────────────────────────────────

export interface UseProjectCreateSubmitReturn {
  submit: () => Promise<void>;
  isPending: boolean;
}

// ── Hook ───────────────────────────────────────────────────────

export function useProjectCreateSubmit(
  form: UseFormReturn<ProjectCreateFormData>,
): UseProjectCreateSubmitReturn {
  const router = useRouter();
  const { execute, isPending } = useConvertFromQuote();
  const { items: rawWorkflowSteps = [] } = useAllActiveWorkflowSteps();
  // Only baseline steps become tasks, so only they can carry an auto-assignment.
  const workflowSteps = useMemo(
    () => rawWorkflowSteps.filter(isProjectBaselineStep),
    [rawWorkflowSteps],
  );
  const { items: employees = [] } = useEmployees({ status: 'active' });

  const submit = useCallback(async () => {
    const values = form.getValues();
    const excludedStepIds = new Set(values.excludedStepIds);
    const manualAssignments = values.taskAssignments;
    const assignmentByStep = new Map(
      manualAssignments.map((a) => [a.workflowStepId, a.assignedToUserId]),
    );

    // Build team user set from selected members (+ PM if explicitly selected)
    const teamUserIds = new Set(values.teamMembers.map((m) => m.userId));
    if (values.projectManagerId) {
      teamUserIds.add(values.projectManagerId);
    }

    // Map role code -> first matching team member userId
    const roleToUserId = new Map<string, string>();
    for (const emp of employees) {
      if (!teamUserIds.has(emp.userId)) continue;
      for (const role of emp.roles ?? []) {
        const key = role.toLowerCase();
        if (!roleToUserId.has(key)) {
          roleToUserId.set(key, emp.userId);
        }
      }
    }

    // Effective assignments = real manual overrides + auto role matches for unassigned tasks.
    // Entries with empty assignedToUserId are explicit "unassign" markers — they block
    // auto-assignment (via assignmentByStep) but must not be sent to the backend.
    const effectiveTaskAssignments = manualAssignments.filter((a) => a.assignedToUserId);
    for (const step of workflowSteps) {
      if (excludedStepIds.has(step.id)) continue;
      if (assignmentByStep.has(step.id)) continue;
      const roleCode = step.defaultRoleCode?.toLowerCase();
      if (!roleCode) continue;
      const matchedUserId = roleToUserId.get(roleCode);
      if (!matchedUserId) continue;
      assignmentByStep.set(step.id, matchedUserId);
      effectiveTaskAssignments.push({
        workflowStepId: step.id,
        assignedToUserId: matchedUserId,
      });
    }

    const payload = {
      name: values.name,
      description: values.description || undefined,
      projectManagerId: values.projectManagerId || undefined,
      teamMembers: values.teamMembers,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      priority: values.priority,
      excludedStepIds: values.excludedStepIds,
      taskAssignments: effectiveTaskAssignments,
      taskMilestoneOverrides: values.taskMilestoneOverrides,
      milestones: values.milestones.map((m) => ({
        name: m.name,
        order: m.order,
      })),
    };

    const project = await execute({ quoteId: values.quoteId, payload });
    router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id }));
  }, [employees, execute, form, router, workflowSteps]);

  return { submit, isPending };
}
