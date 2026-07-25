import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateDiscomDto, UpdateDiscomDto } from '../dto';
import { DiscomEntity } from '../entities/discom.entity';
import {
  DiscomListFilters,
  DiscomListStats,
  DiscomRepository,
} from '../repositories/discom.repository';

export interface PaginatedDiscoms {
  data: (DiscomEntity & { linkedPropertiesCount: number })[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    stats?: DiscomListStats;
    circleNames?: string[];
  };
}

@Injectable()
export class DiscomService {
  constructor(private readonly discomRepository: DiscomRepository) {}

  async findAll(filters?: DiscomListFilters): Promise<PaginatedDiscoms> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const [{ data, total }, stats, circleNames] = await Promise.all([
      this.discomRepository.findAll(filters),
      this.discomRepository.findListStats(filters),
      filters?.includeInactive
        ? this.discomRepository.findDistinctCircleNames({
            includeInactive: true,
            search: filters.search,
            isActive: filters.isActive,
          })
        : Promise.resolve([] as string[]),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        stats,
        ...(filters?.includeInactive ? { circleNames } : {}),
      },
    };
  }

  async findById(id: string, options?: { includeInactive?: boolean }): Promise<DiscomEntity> {
    const discom = options?.includeInactive
      ? await this.discomRepository.findByIdIncludingInactive(id)
      : await this.discomRepository.findById(id);
    if (!discom) throw new NotFoundException('Discom not found');
    return discom;
  }

  async assertActiveDiscom(id: string): Promise<DiscomEntity> {
    const discom = await this.discomRepository.findById(id);
    if (!discom) {
      throw new NotFoundException('Discom not found or inactive');
    }
    return discom;
  }

  async create(data: CreateDiscomDto, createdBy?: string): Promise<DiscomEntity> {
    const existing = await this.discomRepository.findByHierarchy({
      circleName: data.circleName,
      divisionName: data.divisionName,
      subdivisionName: data.subdivisionName,
      sectionName: data.sectionName,
    });
    if (existing) {
      throw new ConflictException('A discom with the same hierarchy already exists');
    }

    return this.discomRepository.create({ ...data, createdBy });
  }

  async update(id: string, data: UpdateDiscomDto, updatedBy?: string): Promise<DiscomEntity> {
    const existing = await this.findById(id, { includeInactive: true });

    if (
      data.circleName !== undefined ||
      data.divisionName !== undefined ||
      data.subdivisionName !== undefined ||
      data.sectionName !== undefined
    ) {
      const duplicate = await this.discomRepository.findByHierarchy({
        circleName: data.circleName ?? existing.circleName,
        divisionName: data.divisionName ?? existing.divisionName,
        subdivisionName:
          data.subdivisionName !== undefined ? data.subdivisionName : existing.subdivisionName,
        sectionName: data.sectionName !== undefined ? data.sectionName : existing.sectionName,
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('A discom with the same hierarchy already exists');
      }
    }

    return this.discomRepository.update(id, { ...data, updatedBy });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id, { includeInactive: true });
    const propertyCount = await this.discomRepository.countActiveProperties(id);
    if (propertyCount > 0) {
      throw new ConflictException(
        `Cannot delete discom: ${propertyCount} active propert${propertyCount === 1 ? 'y is' : 'ies are'} linked to it`,
      );
    }
    await this.discomRepository.softDelete(id);
  }
}
