import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomerStatus, SiteActivityStatus } from '@oneohm-epc/shared/types';

import { CustomerProfileRepository } from '../../customers/repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { CreateSiteActivityDto } from '../dto/create-site-activity.dto';
import { UpdateSiteActivityDto } from '../dto/update-site-activity.dto';
import { SiteActivityEntity } from '../entities/site-activity.entity';
import { SiteActivityRepository } from '../repositories/site-activity.repository';

@Injectable()
export class SiteActivityService {
  private static readonly VISIT_DATA_FIELDS = [
    'gpsCoordinates',
    'availableRoofAreaSqft',
    'shadingAnalysis',
    'notes',
  ] as const;

  private readonly logger = new Logger(SiteActivityService.name);

  constructor(
    private readonly siteActivityRepository: SiteActivityRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly customerRepository: CustomerProfileRepository,
  ) {}

  async create(
    organizationId: string,
    createDto: CreateSiteActivityDto,
    createdBy?: string,
  ): Promise<SiteActivityEntity> {
    if (!createDto.propertyId) {
      throw new BadRequestException('propertyId is required');
    }

    this.logger.log(`Creating site activity for property: ${createDto.propertyId}`);

    const property = await this.propertyRepository.findByIdAndOrganization(
      createDto.propertyId,
      organizationId,
    );
    if (!property) {
      throw new NotFoundException(`Property with ID '${createDto.propertyId}' not found`);
    }
    const customer = await this.customerRepository.findById(property.customerId);
    if (customer?.organizationId !== organizationId) {
      throw new NotFoundException(`Customer with ID '${property.customerId}' not found`);
    }
    if (customer.status === CustomerStatus.INACTIVE) {
      throw new BadRequestException('Cannot perform this action: customer is inactive');
    }

    const existing = await this.siteActivityRepository.existsByPropertyId(
      createDto.propertyId,
      organizationId,
    );
    if (existing) {
      throw new ConflictException(
        `Site activity already exists for property '${createDto.propertyId}'`,
      );
    }

    const activity = await this.siteActivityRepository.createInTransaction({
      customerPropertyId: createDto.propertyId,
      organizationId,
      overallStatus: SiteActivityStatus.PENDING,
      isSiteVisitDone: false,
      isSiteSurveyDone: false,
      gpsCoordinates: createDto.gpsCoordinates,
      availableRoofAreaSqft: createDto.availableRoofAreaSqft,
      shadingAnalysis: createDto.shadingAnalysis,
      notes: createDto.notes,
      createdBy,
    });

    const result = await this.siteActivityRepository.findById(activity.id);
    this.logger.log(`Site activity created: ${activity.id} (${activity.activityNumber})`);
    return result!;
  }

  async findById(id: string, organizationId: string): Promise<SiteActivityEntity> {
    const activity = await this.siteActivityRepository.findById(id);
    if (activity?.organizationId !== organizationId) {
      throw new NotFoundException(`Site activity with ID '${id}' not found`);
    }
    return activity;
  }

  async findByPropertyId(propertyId: string, organizationId: string): Promise<SiteActivityEntity> {
    const property = await this.propertyRepository.findByIdAndOrganization(
      propertyId,
      organizationId,
    );
    if (!property) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found`);
    }
    const activity = await this.siteActivityRepository.findByPropertyId(propertyId);
    if (!activity) {
      throw new NotFoundException(`Site activity not found for property '${propertyId}'`);
    }
    return activity;
  }

  async findAll(
    organizationId: string,
    filters?: {
      overallStatus?: SiteActivityStatus;
      propertyId?: string;
      isSiteVisitDone?: boolean;
      isSiteSurveyDone?: boolean;
    },
    page = 1,
    limit = 20,
  ): Promise<{ data: SiteActivityEntity[]; total: number }> {
    const [data, total] = await this.siteActivityRepository.findByOrganization(
      organizationId,
      filters,
      page,
      limit,
    );
    return { data, total };
  }

  async findByUser(
    organizationId: string,
    userId: string,
    filters?: { overallStatus?: SiteActivityStatus; date?: Date },
    page = 1,
    limit = 20,
  ): Promise<{ data: SiteActivityEntity[]; total: number }> {
    const [data, total] = await this.siteActivityRepository.findByCreatedBy(
      organizationId,
      userId,
      filters,
      page,
      limit,
    );
    return { data, total };
  }

  /**
   * PATCH update: accepts visit or survey data fields.
   * Implicit PENDING -> IN_PROGRESS transition on first visit data.
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateSiteActivityDto,
    updatedBy?: string,
  ): Promise<SiteActivityEntity> {
    const activity = await this.findById(id, organizationId);

    if (activity.overallStatus === SiteActivityStatus.CANCELLED) {
      throw new BadRequestException('Cannot edit a cancelled site activity');
    }

    const updateData: Partial<SiteActivityEntity> = {};

    if (updateDto.gpsCoordinates !== undefined)
      updateData.gpsCoordinates = updateDto.gpsCoordinates;
    if (updateDto.availableRoofAreaSqft !== undefined)
      updateData.availableRoofAreaSqft = updateDto.availableRoofAreaSqft;
    if (updateDto.shadingAnalysis !== undefined)
      updateData.shadingAnalysis = updateDto.shadingAnalysis;
    if (updateDto.notes !== undefined) updateData.notes = updateDto.notes;
    if (updateDto.surveyData !== undefined) updateData.surveyData = updateDto.surveyData;
    if (updatedBy) updateData.updatedBy = updatedBy;

    // Implicit PENDING -> IN_PROGRESS on first visit data (NEW-7)
    if (activity.overallStatus === SiteActivityStatus.PENDING) {
      const hasVisitData = SiteActivityService.VISIT_DATA_FIELDS.some(
        (field) => updateDto[field] !== undefined,
      );
      if (hasVisitData) {
        updateData.overallStatus = SiteActivityStatus.IN_PROGRESS;
      }
    }

    const updated = await this.siteActivityRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Site activity with ID '${id}' not found`);
    }
    return updated;
  }

  /**
   * Complete the visit phase.
   * Validates required visit data, stores audit in metadata.
   */
  async completeVisit(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<SiteActivityEntity> {
    const activity = await this.findById(id, organizationId);

    if (activity.isSiteVisitDone) {
      throw new BadRequestException('Visit phase is already completed');
    }
    if (activity.overallStatus === SiteActivityStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete visit on a cancelled activity');
    }

    // Validate required visit data
    if (!activity.gpsCoordinates) {
      throw new BadRequestException('GPS coordinates are required to complete the visit');
    }
    if (!activity.availableRoofAreaSqft || Number(activity.availableRoofAreaSqft) <= 0) {
      throw new BadRequestException('Available roof area must be greater than 0');
    }

    const now = new Date();
    const existingMetadata = activity.metadata ?? {};

    const updated = await this.siteActivityRepository.update(id, {
      isSiteVisitDone: true,
      overallStatus: SiteActivityStatus.IN_PROGRESS,
      metadata: {
        ...existingMetadata,
        visitCompletedBy: userId,
        visitCompletedAt: now.toISOString(),
      },
      updatedBy: userId,
    });

    this.logger.log(`Visit phase completed for activity: ${id}`);
    return updated!;
  }

  /**
   * Complete the survey phase.
   * Validates visit is done first, then sets COMPLETED.
   */
  async completeSurvey(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<SiteActivityEntity> {
    const activity = await this.findById(id, organizationId);

    if (!activity.isSiteVisitDone) {
      throw new BadRequestException('Site visit must be completed before survey can be completed');
    }
    if (activity.overallStatus === SiteActivityStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete survey on a cancelled activity');
    }

    // Validate survey data is present before marking complete
    const surveyData = activity.surveyData as Record<string, unknown> | undefined;
    if (!surveyData?.roofType || !surveyData?.roofCondition) {
      throw new BadRequestException('Roof type and condition are required to complete the survey');
    }

    const now = new Date();
    // Idempotent: if already completed, just update the timestamp and return —
    // this allows the surveyor to re-submit with corrected survey data.
    const updated = await this.siteActivityRepository.update(id, {
      isSiteSurveyDone: true,
      overallStatus: SiteActivityStatus.COMPLETED,
      completedBy: userId,
      completedAt: activity.isSiteSurveyDone ? activity.completedAt : now,
      surveyorId: userId,
      updatedBy: userId,
    });

    this.logger.log(`Survey phase completed, activity completed: ${id}`);
    return updated!;
  }

  async cancel(id: string, organizationId: string, userId: string): Promise<SiteActivityEntity> {
    const activity = await this.findById(id, organizationId);

    if (activity.overallStatus === SiteActivityStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed site activity');
    }

    const updated = await this.siteActivityRepository.update(id, {
      overallStatus: SiteActivityStatus.CANCELLED,
      updatedBy: userId,
    });

    this.logger.log(`Site activity cancelled: ${id}`);
    return updated!;
  }

  async delete(id: string, organizationId: string, deletedBy?: string): Promise<void> {
    const activity = await this.findById(id, organizationId);
    await this.siteActivityRepository.softDelete(activity.id, deletedBy);
    this.logger.log(`Site activity deleted: ${id}`);
  }

  async getStatusCounts(organizationId: string, userId: string): Promise<Record<string, number>> {
    const stats = await this.siteActivityRepository.countByStatusForUser(organizationId, userId);
    const result: Record<string, number> = {
      [SiteActivityStatus.PENDING]: 0,
      [SiteActivityStatus.IN_PROGRESS]: 0,
      [SiteActivityStatus.COMPLETED]: 0,
      [SiteActivityStatus.CANCELLED]: 0,
    };
    for (const stat of stats) {
      result[stat.status] = stat.count;
    }
    return result;
  }
}
