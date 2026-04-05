import { MilestoneType } from '@oneohm-epc/shared/types';

import { buildWorkflowStepPayload } from './workflow-step-payload';
import { type WorkflowStepFormValues } from '../schemas/workflow-step.schema';

function makeFormValues(overrides: Partial<WorkflowStepFormValues> = {}): WorkflowStepFormValues {
  return {
    name: 'Panel Installation',
    code: 'EXEC-001',
    description: '',
    type: 'execution',
    defaultRoleCode: '',
    defaultDepartment: '',
    defaultMilestoneType: MilestoneType.INSTALLATION,
    sequenceOrder: 1,
    effortDays: '' as unknown as number,
    isMandatory: true,
    canRunParallel: false,
    dependsOnTaskCodes: [],
    checklistTemplate: [],
    ...overrides,
  };
}

describe('buildWorkflowStepPayload', () => {
  it('keeps empty dependency array to allow explicit clear updates', () => {
    const payload = buildWorkflowStepPayload(
      makeFormValues({
        dependsOnTaskCodes: [],
      }),
    );

    expect(payload.dependsOnTaskCodes).toEqual([]);
  });

  it('keeps empty checklist array and trims blank items', () => {
    const payload = buildWorkflowStepPayload(
      makeFormValues({
        checklistTemplate: [
          { id: '1', title: 'Valid Item', isCompleted: false, order: 0 },
          { id: '2', title: '   ', isCompleted: false, order: 1 },
        ],
      }),
    );

    expect(payload.checklistTemplate).toEqual({
      items: [{ id: '1', title: 'Valid Item', isCompleted: false, order: 0 }],
    });

    const clearedPayload = buildWorkflowStepPayload(
      makeFormValues({
        checklistTemplate: [],
      }),
    );
    expect(clearedPayload.checklistTemplate).toEqual({ items: [] });
  });
});
