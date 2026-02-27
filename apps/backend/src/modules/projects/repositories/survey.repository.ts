import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SiteSurveyStatus } from '@oneohm-epc/shared-types';
import { type EntityManager, IsNull, Repository } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { SiteSurveyEntity } from '../entities/site-survey.entity';

/**
 * Site Survey Repository
 * Handles database operations for site surveys (one-to-one with project)
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
   * Find the survey for a project (returns null if none exists)
   */
  async findByProject(projectId: string): Promise<SiteSurveyEntity | null> {
    return this.repository.findOne({
      where: { projectId, deletedAt: IsNull() },
      relations: ['surveyor'],
    });
  }

  /**
   * Find the survey for a project or throw NotFoundException
   */
  async findByProjectOrFail(projectId: string): Promise<SiteSurveyEntity> {
    const survey = await this.findByProject(projectId);

    if (!survey) {
      throw new NotFoundException(`Site survey for project ${projectId} not found`);
    }

    return survey;
  }

  /**
   * Update survey by ID (no project ownership check — caller must pre-validate)
   */
  async updateById(id: string, data: Record<string, unknown>): Promise<void> {
    await this.repository.update(id, data);
  }

  /**
   * Update a survey identified by projectId
   */
  async update(projectId: string, updateData: Record<string, unknown>): Promise<SiteSurveyEntity> {
    const survey = await this.findByProjectOrFail(projectId);
    await this.repository.update(survey.id, updateData);
    return this.findByProjectOrFail(projectId);
  }

  /**
   * Soft delete a survey by projectId
   */
  async delete(projectId: string): Promise<void> {
    const survey = await this.findByProjectOrFail(projectId);
    const result = await this.repository.softDelete(survey.id);

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Site survey for project ${projectId} not found`);
    }
  }

  /**
   * Update survey status by projectId
   */
  async updateStatus(projectId: string, status: SiteSurveyStatus): Promise<SiteSurveyEntity> {
    const survey = await this.findByProjectOrFail(projectId);
    await this.repository.update(survey.id, { status });
    return this.findByProjectOrFail(projectId);
  }

  /**
   * Generate a unique survey code (e.g. SSV-ONEOHM-2026-0001)
   */
  async generateSurveyCode(orgCode: string, manager?: EntityManager): Promise<string> {
    return generateEntityCode(this.repository, 'surveyCode', 'SSV', orgCode, 'survey_code', manager);
  }
}
