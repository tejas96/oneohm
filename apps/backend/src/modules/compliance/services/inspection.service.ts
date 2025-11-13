import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InspectionStatus } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';

import { InspectionRepository } from '../repositories/inspection.repository';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  InspectionResponseDto,
} from '../dto';

@Injectable()
export class InspectionService {
  constructor(private readonly repository: InspectionRepository) {}

  async create(createDto: CreateInspectionDto): Promise<InspectionResponseDto> {
    const inspectionNumber = await this.repository.generateInspectionNumber();

    const inspection = await this.repository.create({
      ...createDto,
      inspectionNumber,
      status: createDto.status || InspectionStatus.SCHEDULED,
    });

    return plainToInstance(InspectionResponseDto, inspection, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<InspectionResponseDto[]> {
    const inspections = await this.repository.findAll();
    return plainToInstance(InspectionResponseDto, inspections, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: string): Promise<InspectionResponseDto> {
    const inspection = await this.repository.findById(id);
    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }
    return plainToInstance(InspectionResponseDto, inspection, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateDto: UpdateInspectionDto): Promise<InspectionResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, updateDto);
    if (!updated) {
      throw new NotFoundException(`Failed to update inspection with ID ${id}`);
    }

    return plainToInstance(InspectionResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const inspection = await this.repository.findById(id);
    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete inspection with ID ${id}`);
    }
  }

  async findByProject(projectId: string): Promise<InspectionResponseDto[]> {
    const inspections = await this.repository.findByProject(projectId);
    return plainToInstance(InspectionResponseDto, inspections, {
      excludeExtraneousValues: true,
    });
  }

  async findByStatus(status: InspectionStatus): Promise<InspectionResponseDto[]> {
    const inspections = await this.repository.findByStatus(status);
    return plainToInstance(InspectionResponseDto, inspections, {
      excludeExtraneousValues: true,
    });
  }

  async findUpcoming(): Promise<InspectionResponseDto[]> {
    const inspections = await this.repository.findUpcoming();
    return plainToInstance(InspectionResponseDto, inspections, {
      excludeExtraneousValues: true,
    });
  }

  async completeInspection(id: string, passed: boolean, report?: string): Promise<InspectionResponseDto> {
    const inspection = await this.repository.findById(id);
    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, {
      status: passed ? InspectionStatus.PASSED : InspectionStatus.FAILED,
      actualDate: new Date(),
      inspectionReport: report,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to complete inspection`);
    }

    return plainToInstance(InspectionResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }
}
