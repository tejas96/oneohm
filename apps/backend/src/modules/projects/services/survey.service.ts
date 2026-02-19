import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SiteSurveyStatus } from '@oneohm-epc/shared-types';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreateSurveyDto, UpdateSurveyDto } from '../dto';
import { SiteSurveyEntity } from '../entities/site-survey.entity';
import { ProjectRepository, SurveyRepository } from '../repositories';

/**
 * Survey Service
 * Business logic for site survey management
 */
@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Create a new site survey
   */
  async create(organizationId: string, createDto: CreateSurveyDto): Promise<SiteSurveyEntity> {
    // Verify project exists and belongs to organization
    await this.projectRepository.findById(createDto.projectId, organizationId);

    // Create survey
    const survey = await this.surveyRepository.create({
      projectId: createDto.projectId,
      surveyorId: createDto.surveyorId,
      surveyDate: new Date(createDto.surveyDate),
      status: createDto.status || SiteSurveyStatus.SCHEDULED,
      roofType: createDto.roofType,
      roofCondition: createDto.roofCondition,
      roofOrientation: createDto.roofOrientation,
      roofTiltAngle: createDto.roofTiltAngle,
      availableAreaSqm: createDto.availableAreaSqm,
      shadingAnalysis: createDto.shadingAnalysis,
      electricalDetails: createDto.electricalDetails,
      structuralAssessment: createDto.structuralAssessment,
      siteAccess: createDto.siteAccess,
      safetyConcerns: createDto.safetyConcerns,
      recommendations: createDto.recommendations,
      photos: createDto.photos,
      documents: createDto.documents,
      notes: createDto.notes,
    });

    // Generate human-readable code (e.g. SSV-ONEOHM_EPC-2026-0001)
    try {
      const org = await this.organizationRepository.findOneById(organizationId);
      if (org) {
        const surveyCode = await generateEntityCode(
          this.surveyRepository.repository,
          'surveyCode',
          'SSV',
          org.code,
          'survey_code',
        );
        await this.surveyRepository.repository.update(survey.id, { surveyCode });
      }
    } catch (err) {
      this.logger.warn(`Failed to generate survey code for ${survey.id}: ${String(err)}`);
    }

    return this.surveyRepository.findById(survey.id, createDto.projectId);
  }

  /**
   * Find all surveys for a project
   */
  async findByProject(
    projectId: string,
    organizationId: string,
    filters?: {
      status?: SiteSurveyStatus;
      surveyorId?: string;
    },
  ): Promise<SiteSurveyEntity[]> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.surveyRepository.findByProject(projectId, filters);
  }

  /**
   * Find survey by ID
   */
  async findById(id: string, projectId: string, organizationId: string): Promise<SiteSurveyEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.surveyRepository.findById(id, projectId);
  }

  /**
   * Update a survey
   */
  async update(
    id: string,
    projectId: string,
    organizationId: string,
    updateDto: UpdateSurveyDto,
  ): Promise<SiteSurveyEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify survey exists
    await this.surveyRepository.findById(id, projectId);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updateDto,
      surveyDate: updateDto.surveyDate ? new Date(updateDto.surveyDate) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return this.surveyRepository.update(id, projectId, updateData);
  }

  /**
   * Delete a survey
   */
  async delete(id: string, projectId: string, organizationId: string): Promise<void> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    // Verify survey exists
    const survey = await this.surveyRepository.findById(id, projectId);

    // Check if survey can be deleted (only scheduled)
    if (survey.status !== SiteSurveyStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot delete survey with status ${survey.status}. Only scheduled surveys can be deleted.`,
      );
    }

    await this.surveyRepository.delete(id, projectId);
  }

  /**
   * Update survey status
   */
  async updateStatus(
    id: string,
    projectId: string,
    organizationId: string,
    newStatus: SiteSurveyStatus,
  ): Promise<SiteSurveyEntity> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    await this.surveyRepository.updateStatus(id, projectId, newStatus);
    return this.surveyRepository.findById(id, projectId);
  }

  /**
   * Find latest survey for a project
   */
  async findLatest(projectId: string, organizationId: string): Promise<SiteSurveyEntity | null> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.surveyRepository.findLatest(projectId);
  }

  /**
   * Find completed surveys for a project
   */
  async findCompleted(projectId: string, organizationId: string): Promise<SiteSurveyEntity[]> {
    // Verify project exists
    await this.projectRepository.findById(projectId, organizationId);

    return this.surveyRepository.findCompleted(projectId);
  }
}
