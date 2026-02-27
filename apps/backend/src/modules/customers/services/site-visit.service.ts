import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SiteVisitStatus } from '@oneohm-epc/shared-types';

import { CreateSiteVisitDto } from '../dto/create-site-visit.dto';
import { UpdateSiteVisitDto } from '../dto/update-site-visit.dto';
import { SiteVisitEntity } from '../entities/site-visit.entity';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { SiteVisitRepository } from '../repositories/site-visit.repository';

/**
 * Site Visit Service
 * Business logic for field worker site visits
 */
@Injectable()
export class SiteVisitService {
  private readonly logger = new Logger(SiteVisitService.name);

  constructor(
    private readonly siteVisitRepository: SiteVisitRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
  ) {}

  /**
   * Create a new site visit for a property
   * @throws ConflictException if property already has a site visit
   */
  async create(
    propertyId: string,
    organizationId: string,
    createDto: CreateSiteVisitDto,
    createdBy?: string,
  ): Promise<SiteVisitEntity> {
    this.logger.log(`Creating site visit for property: ${propertyId}`);

    // Verify property exists and belongs to organization
    const property = await this.propertyRepository.findByIdAndOrganization(
      propertyId,
      organizationId,
    );

    if (!property) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found`);
    }

    // Check if property already has a site visit
    const existingVisit = await this.siteVisitRepository.existsByPropertyId(propertyId);
    if (existingVisit) {
      throw new ConflictException(`Site visit already exists for property '${propertyId}'`);
    }

    // Generate unique visit number
    const visitNumber = await this.siteVisitRepository.getNextVisitNumber();

    const createdVisit = await this.siteVisitRepository.create({
      customerPropertyId: propertyId,
      visitNumber,
      status: SiteVisitStatus.PENDING,
      gpsCoordinates: createDto.gpsCoordinates,
      availableRoofAreaSqft: createDto.availableRoofAreaSqft,
      shadingAnalysis: createDto.shadingAnalysis,
      photos: createDto.photos,
      visitNotes: createDto.visitNotes,
      createdBy,
    });

    // Fetch with relations for response
    const siteVisit = await this.siteVisitRepository.findById(createdVisit.id);

    this.logger.log(`✅ Site visit created: ${createdVisit.id} (${visitNumber})`);
    return siteVisit!;
  }

  /**
   * Find site visit by property ID
   */
  async findByPropertyId(propertyId: string, organizationId: string): Promise<SiteVisitEntity> {
    // Verify property belongs to organization
    const property = await this.propertyRepository.findByIdAndOrganization(
      propertyId,
      organizationId,
    );

    if (!property) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found`);
    }

    const siteVisit = await this.siteVisitRepository.findByPropertyId(propertyId);

    if (!siteVisit) {
      throw new NotFoundException(`Site visit not found for property '${propertyId}'`);
    }

    return siteVisit;
  }

  /**
   * Find site visit by ID
   */
  async findById(id: string): Promise<SiteVisitEntity> {
    const siteVisit = await this.siteVisitRepository.findById(id);

    if (!siteVisit) {
      throw new NotFoundException(`Site visit with ID '${id}' not found`);
    }

    return siteVisit;
  }

  /**
   * List all site visits for the current user (via properties they created)
   */
  async findByUser(
    userId: string,
    filters?: {
      status?: SiteVisitStatus;
      date?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<{ data: SiteVisitEntity[]; total: number }> {
    const [data, total] = await this.siteVisitRepository.findByCreatedBy(
      userId,
      filters,
      page,
      limit,
    );
    return { data, total };
  }

  /**
   * List all site visits for an organization
   */
  async findByOrganization(
    organizationId: string,
    filters?: {
      status?: SiteVisitStatus;
    },
    page = 1,
    limit = 20,
  ): Promise<{ data: SiteVisitEntity[]; total: number }> {
    const [data, total] = await this.siteVisitRepository.findByOrganization(
      organizationId,
      filters,
      page,
      limit,
    );
    return { data, total };
  }

  /**
   * Update site visit
   */
  async update(
    propertyId: string,
    organizationId: string,
    updateDto: UpdateSiteVisitDto,
    updatedBy?: string,
  ): Promise<SiteVisitEntity> {
    this.logger.log(`Updating site visit for property: ${propertyId}`);

    // Find the site visit first
    const siteVisit = await this.findByPropertyId(propertyId, organizationId);

    // Build update object with only defined values
    const updateData: Partial<SiteVisitEntity> = {};
    if (updateDto.gpsCoordinates !== undefined)
      updateData.gpsCoordinates = updateDto.gpsCoordinates;
    if (updateDto.availableRoofAreaSqft !== undefined)
      updateData.availableRoofAreaSqft = updateDto.availableRoofAreaSqft;
    if (updateDto.shadingAnalysis !== undefined)
      updateData.shadingAnalysis = updateDto.shadingAnalysis;
    if (updateDto.photos !== undefined) updateData.photos = updateDto.photos;
    if (updateDto.visitNotes !== undefined) updateData.visitNotes = updateDto.visitNotes;
    if (updatedBy) updateData.updatedBy = updatedBy;

    const updated = await this.siteVisitRepository.update(siteVisit.id, updateData);

    if (!updated) {
      throw new NotFoundException(`Site visit not found for property '${propertyId}'`);
    }

    this.logger.log(`Site visit updated: ${updated.id}`);
    return updated;
  }

  /**
   * Mark site visit as completed
   */
  async complete(
    propertyId: string,
    organizationId: string,
    updatedBy?: string,
  ): Promise<SiteVisitEntity> {
    this.logger.log(`Completing site visit for property: ${propertyId}`);

    const siteVisit = await this.findByPropertyId(propertyId, organizationId);

    const updated = await this.siteVisitRepository.update(siteVisit.id, {
      status: SiteVisitStatus.COMPLETED,
      updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Site visit not found for property '${propertyId}'`);
    }

    this.logger.log(`Site visit completed: ${updated.id}`);
    return updated;
  }

  /**
   * Delete site visit (soft delete)
   */
  async delete(propertyId: string, organizationId: string, deletedBy?: string): Promise<void> {
    this.logger.log(`Deleting site visit for property: ${propertyId}`);

    const siteVisit = await this.findByPropertyId(propertyId, organizationId);

    await this.siteVisitRepository.softDelete(siteVisit.id, deletedBy);

    this.logger.log(`Site visit deleted: ${siteVisit.id}`);
  }

  /**
   * Get status counts for a user's site visits (for dashboard)
   */
  async getStatusCounts(userId: string): Promise<Record<string, number>> {
    const stats = await this.siteVisitRepository.countByStatusForUser(userId);

    // Initialize all statuses with 0
    const result: Record<string, number> = {
      [SiteVisitStatus.PENDING]: 0,
      [SiteVisitStatus.IN_PROGRESS]: 0,
      [SiteVisitStatus.COMPLETED]: 0,
    };

    // Fill in actual counts
    for (const stat of stats) {
      result[stat.status] = stat.count;
    }

    return result;
  }
}
