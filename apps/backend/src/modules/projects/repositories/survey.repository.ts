import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SiteSurveyStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { SiteSurveyEntity } from '../entities/site-survey.entity';

/**
 * Site Survey Repository
 * Handles database operations for site surveys
 */
@Injectable()
export class SurveyRepository {
  constructor(
    @InjectRepository(SiteSurveyEntity)
    public readonly repository: Repository<SiteSurveyEntity>,
  ) {}

  /**
   * Create a new site survey
   */
  async create(surveyData: Partial<SiteSurveyEntity>): Promise<SiteSurveyEntity> {
    const survey = this.repository.create(surveyData);
    return this.repository.save(survey);
  }

  /**
   * Update survey by ID (no project ownership check — caller must pre-validate)
   */
  async updateById(id: string, data: Record<string, unknown>): Promise<void> {
    await this.repository.update(id, data);
  }

  /**
   * Find survey by ID
   */
  async findById(id: string, projectId: string): Promise<SiteSurveyEntity> {
    const survey = await this.repository.findOne({
      where: { id, projectId },
      relations: ['project', 'surveyor'],
    });

    if (!survey) {
      throw new NotFoundException(`Site survey with ID ${id} not found`);
    }

    return survey;
  }

  /**
   * Find all surveys for a project
   */
  async findByProject(
    projectId: string,
    filters?: {
      status?: SiteSurveyStatus;
      surveyorId?: string;
    },
  ): Promise<SiteSurveyEntity[]> {
    const query = this.repository
      .createQueryBuilder('survey')
      .leftJoinAndSelect('survey.surveyor', 'surveyor')
      .where('survey.projectId = :projectId', { projectId })
      .andWhere('survey.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('survey.status = :status', { status: filters.status });
    }

    if (filters?.surveyorId) {
      query.andWhere('survey.surveyorId = :surveyorId', { surveyorId: filters.surveyorId });
    }

    return query.orderBy('survey.surveyDate', 'DESC').getMany();
  }

  /**
   * Update a survey
   */
  async update(
    id: string,
    projectId: string,
    updateData: Record<string, unknown>,
  ): Promise<SiteSurveyEntity> {
    await this.repository.update({ id, projectId }, updateData);
    return this.findById(id, projectId);
  }

  /**
   * Delete a survey
   */
  async delete(id: string, projectId: string): Promise<void> {
    const result = await this.repository.softDelete({ id, projectId });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Site survey with ID ${id} not found`);
    }
  }

  /**
   * Update survey status
   */
  async updateStatus(
    id: string,
    projectId: string,
    status: SiteSurveyStatus,
  ): Promise<SiteSurveyEntity> {
    await this.repository.update({ id, projectId }, { status });
    return this.findById(id, projectId);
  }

  /**
   * Find completed surveys for a project
   */
  async findCompleted(projectId: string): Promise<SiteSurveyEntity[]> {
    return this.repository.find({
      where: {
        projectId,
        status: SiteSurveyStatus.COMPLETED,
        deletedAt: IsNull(),
      },
      order: { surveyDate: 'DESC' },
    });
  }

  /**
   * Find latest survey for a project
   */
  async findLatest(projectId: string): Promise<SiteSurveyEntity | null> {
    return this.repository.findOne({
      where: { projectId, deletedAt: IsNull() },
      order: { surveyDate: 'DESC' },
      relations: ['surveyor'],
    });
  }

  /**
   * Generate a unique survey code (e.g. SSV-ONEOHM-2026-0001)
   */
  async generateSurveyCode(orgCode: string): Promise<string> {
    return generateEntityCode(this.repository, 'surveyCode', 'SSV', orgCode, 'survey_code');
  }
}
