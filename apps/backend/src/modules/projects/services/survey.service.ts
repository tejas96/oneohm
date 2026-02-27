import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SiteSurveyStatus } from '@oneohm-epc/shared-types';
import { DataSource, IsNull, QueryFailedError } from 'typeorm';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { UpsertSurveyDto, UpdateSurveyDto } from '../dto';
import { SiteSurveyEntity } from '../entities/site-survey.entity';
import { ProjectRepository, SurveyRepository } from '../repositories';

/**
 * Survey Service
 * Business logic for site survey management (one-to-one with project)
 */
@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  private readonly validTransitions: Record<SiteSurveyStatus, SiteSurveyStatus[]> = {
    [SiteSurveyStatus.SCHEDULED]: [SiteSurveyStatus.IN_PROGRESS, SiteSurveyStatus.CANCELLED],
    [SiteSurveyStatus.IN_PROGRESS]: [SiteSurveyStatus.COMPLETED, SiteSurveyStatus.CANCELLED],
    [SiteSurveyStatus.COMPLETED]: [],
    [SiteSurveyStatus.CANCELLED]: [SiteSurveyStatus.SCHEDULED],
  };

  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create or update the site survey for a project (idempotent upsert)
   */
  async upsert(
    organizationId: string,
    projectId: string,
    dto: UpsertSurveyDto,
    userId: string,
  ): Promise<SiteSurveyEntity> {
    await this.projectRepository.findById(projectId, organizationId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(SiteSurveyEntity);
        const existing = await repo.findOne({
          where: { projectId, deletedAt: IsNull() },
        });

        if (existing) {
          this.logger.log(`Survey updated for project ${projectId}`);
          await repo.update(existing.id, {
            surveyorId: dto.surveyorId,
            surveyData: dto.surveyData,
            documents: dto.documents,
            updatedBy: userId,
          });
          return repo.findOneOrFail({
            where: { id: existing.id },
            relations: ['surveyor'],
          });
        }

        this.logger.log(`Survey created for project ${projectId}`);
        const survey = repo.create({
          projectId,
          surveyorId: dto.surveyorId,
          surveyData: dto.surveyData,
          documents: dto.documents,
          createdBy: userId,
        });
        const saved = await repo.save(survey);

        try {
          const org = await this.organizationRepository.findOneById(organizationId);
          if (org) {
            const surveyCode = await this.surveyRepository.generateSurveyCode(org.code, manager);
            await repo.update(saved.id, { surveyCode });
          }
        } catch (err) {
          this.logger.warn(`Failed to generate survey code for ${saved.id}: ${String(err)}`);
        }

        return repo.findOneOrFail({
          where: { id: saved.id },
          relations: ['surveyor'],
        });
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code: string }).code === '23505'
      ) {
        this.logger.warn(`Concurrent upsert detected for project ${projectId}, retrying as update`);
        return this.update(projectId, organizationId, dto, userId);
      }
      throw error;
    }
  }

  /**
   * Find the survey for a project
   */
  async findByProject(projectId: string, organizationId: string): Promise<SiteSurveyEntity | null> {
    await this.projectRepository.findById(projectId, organizationId);
    return this.surveyRepository.findByProject(projectId);
  }

  /**
   * Partially update a survey
   */
  async update(
    projectId: string,
    organizationId: string,
    dto: UpdateSurveyDto,
    userId: string,
  ): Promise<SiteSurveyEntity> {
    await this.projectRepository.findById(projectId, organizationId);
    const existing = await this.surveyRepository.findByProjectOrFail(projectId);

    const updateData: Record<string, unknown> = { updatedBy: userId };

    if (dto.surveyorId !== undefined) {
      updateData.surveyorId = dto.surveyorId;
    }

    if (dto.documents !== undefined) {
      updateData.documents = dto.documents;
    }

    if (dto.surveyData !== undefined) {
      updateData.surveyData = { ...existing.surveyData, ...dto.surveyData };
    }

    this.logger.log(`Survey updated for project ${projectId}`);
    return this.surveyRepository.update(projectId, updateData);
  }

  /**
   * Soft delete the survey for a project
   */
  async delete(projectId: string, organizationId: string): Promise<void> {
    await this.projectRepository.findById(projectId, organizationId);

    const survey = await this.surveyRepository.findByProjectOrFail(projectId);

    if (survey.status !== SiteSurveyStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot delete survey with status ${survey.status}. Only scheduled surveys can be deleted.`,
      );
    }

    await this.surveyRepository.delete(projectId);
    this.logger.log(`Survey deleted for project ${projectId}`);
  }

  /**
   * Update survey status with FSM validation
   */
  async updateStatus(
    projectId: string,
    organizationId: string,
    newStatus: SiteSurveyStatus,
  ): Promise<SiteSurveyEntity> {
    await this.projectRepository.findById(projectId, organizationId);

    const survey = await this.surveyRepository.findByProjectOrFail(projectId);
    this.validateStatusTransition(survey.status, newStatus);

    this.logger.log(`Survey ${projectId} status: ${survey.status} -> ${newStatus}`);
    return this.surveyRepository.updateStatus(projectId, newStatus);
  }

  // ==================== Private Methods ====================

  private validateStatusTransition(
    currentStatus: SiteSurveyStatus,
    newStatus: SiteSurveyStatus,
  ): void {
    const allowed = this.validTransitions[currentStatus];

    if (!allowed?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${(allowed ?? []).join(', ') || 'none'}`,
      );
    }
  }
}
