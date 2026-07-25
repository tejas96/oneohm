import { Injectable, Logger } from '@nestjs/common';
import {
  ChangeRequestStatus,
  TaskPriority,
  TaskStatus,
  type StoredChangeRequest,
} from '@tejas96/shared/types';
import { type EntityManager, IsNull } from 'typeorm';

import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import {
  buildChangeRequestTaskDescription,
  getChangeRequestPropertyUpdates,
} from '../../customers/utils/change-request.util';
import { ProjectTaskEntity } from '../entities/project-task.entity';
import { ProjectEntity } from '../entities/project.entity';
import { WorkflowStepEntity } from '../entities/workflow-step.entity';
import { ProjectTaskRepository } from '../repositories/project-task.repository';

@Injectable()
export class ChangeRequestTaskService {
  private readonly logger = new Logger(ChangeRequestTaskService.name);

  constructor(private readonly taskRepository: ProjectTaskRepository) {}

  async applyChangeRequestTasks(params: {
    projectId: string;
    propertyId: string;
    organizationId: string;
    createdBy: string;
    orgCode: string;
    manager: EntityManager;
  }): Promise<void> {
    const { projectId, propertyId, organizationId, createdBy, orgCode, manager } = params;

    const propertyRepo = manager.getRepository(CustomerPropertyEntity);
    const property = await propertyRepo.findOne({
      where: { id: propertyId, organizationId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!property?.changeRequests?.length) return;

    const updatedRequests: StoredChangeRequest[] = [...property.changeRequests];
    let hasUpdates = false;

    for (let index = 0; index < updatedRequests.length; index++) {
      const request = updatedRequests[index];
      if (!request || request.status !== ChangeRequestStatus.PENDING) continue;

      const step = await manager.getRepository(WorkflowStepEntity).findOne({
        where: {
          organizationId,
          changeRequestType: request.type,
          isActive: true,
          isSpecial: true,
          deletedAt: IsNull(),
        },
      });

      if (!step) {
        this.logger.warn(
          `No workflow step template found for change request type "${request.type}" in org ${organizationId}`,
        );
        continue;
      }

      let taskCode: string;
      try {
        taskCode = await this.taskRepository.generateTaskCode(orgCode, manager);
      } catch {
        taskCode = step.code;
      }

      const task = await this.taskRepository.create(
        {
          projectId,
          workflowStepId: step.id,
          code: taskCode,
          name: step.name,
          description: buildChangeRequestTaskDescription(request),
          kanbanOrder: 1,
          priority: TaskPriority.URGENT,
          status: TaskStatus.BACKLOG,
          isSpecial: true,
          changeRequestType: request.type,
          sourceChangeRequestIndex: index,
          createdBy,
          updatedBy: createdBy,
        },
        manager,
      );

      updatedRequests[index] = {
        ...request,
        status: ChangeRequestStatus.CONVERTED,
        projectTaskId: task.id,
      };
      hasUpdates = true;
    }

    if (hasUpdates) {
      await propertyRepo.update(propertyId, { changeRequests: updatedRequests });
    }
  }

  async applyPropertyWriteBack(task: ProjectTaskEntity, manager?: EntityManager): Promise<void> {
    if (!task.isSpecial || !task.changeRequestType || task.sourceChangeRequestIndex == null) {
      return;
    }

    const em = manager ?? this.taskRepository.repository.manager;

    const project = await em.getRepository(ProjectEntity).findOne({
      where: { id: task.projectId },
      select: ['id', 'propertyId'],
    });

    if (!project?.propertyId) return;

    const propertyRepo = em.getRepository(CustomerPropertyEntity);
    const property = await propertyRepo.findOne({
      where: { id: project.propertyId },
      lock: manager ? { mode: 'pessimistic_write' } : undefined,
    });

    if (!property) return;

    const request = property.changeRequests?.[task.sourceChangeRequestIndex];
    if (!request) return;

    const updates = getChangeRequestPropertyUpdates(request);
    if (Object.keys(updates).length === 0) return;

    try {
      await propertyRepo.update(project.propertyId, updates as Record<string, unknown>);
    } catch (error) {
      this.logger.warn(`Failed to write back change request for task ${task.id}: ${String(error)}`);
    }
  }
}
