import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubsidyStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  CreateSubsidyApplicationDto,
  UpdateSubsidyApplicationDto,
  SubsidyApplicationResponseDto,
} from '../dto';
import { SubsidyApplicationRepository } from '../repositories/subsidy-application.repository';

@Injectable()
export class SubsidyApplicationService {
  constructor(private readonly repository: SubsidyApplicationRepository) {}

  async create(createDto: CreateSubsidyApplicationDto): Promise<SubsidyApplicationResponseDto> {
    const applicationNumber = await this.repository.generateApplicationNumber();
    const applicationDate = createDto.applicationDate || new Date();

    const application = await this.repository.create({
      ...createDto,
      applicationNumber,
      applicationDate,
      status: createDto.status || SubsidyStatus.INITIATED,
    });

    return plainToInstance(SubsidyApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<SubsidyApplicationResponseDto[]> {
    const applications = await this.repository.findAll();
    return plainToInstance(SubsidyApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: string): Promise<SubsidyApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Subsidy application with ID ${id} not found`);
    }
    return plainToInstance(SubsidyApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateDto: UpdateSubsidyApplicationDto,
  ): Promise<SubsidyApplicationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Subsidy application with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, updateDto);
    if (!updated) {
      throw new NotFoundException(`Failed to update subsidy application with ID ${id}`);
    }

    return plainToInstance(SubsidyApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Subsidy application with ID ${id} not found`);
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete subsidy application with ID ${id}`);
    }
  }

  async findByProject(projectId: string): Promise<SubsidyApplicationResponseDto[]> {
    const applications = await this.repository.findByProject(projectId);
    return plainToInstance(SubsidyApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findByCustomer(customerId: string): Promise<SubsidyApplicationResponseDto[]> {
    const applications = await this.repository.findByCustomer(customerId);
    return plainToInstance(SubsidyApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findByStatus(status: SubsidyStatus): Promise<SubsidyApplicationResponseDto[]> {
    const applications = await this.repository.findByStatus(status);
    return plainToInstance(SubsidyApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async approve(id: string, approvedAmount: number): Promise<SubsidyApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Subsidy application with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, {
      status: SubsidyStatus.APPROVED,
      approvedAmount,
      approvedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException(`Failed to approve subsidy application`);
    }

    return plainToInstance(SubsidyApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async disburse(
    id: string,
    disbursementAmount: number,
    disbursementMode: string,
    disbursementReference: string,
  ): Promise<SubsidyApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Subsidy application with ID ${id} not found`);
    }

    if (application.status !== SubsidyStatus.APPROVED) {
      throw new BadRequestException('Only approved applications can be disbursed');
    }

    const updated = await this.repository.update(id, {
      status: SubsidyStatus.DISBURSED,
      disbursementDate: new Date(),
      disbursementAmount,
      disbursementMode,
      disbursementReference,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to disburse subsidy`);
    }

    return plainToInstance(SubsidyApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async getStatsByOrganization(organizationId: string): Promise<Record<string, unknown>> {
    return this.repository.getStatsByOrganization(organizationId);
  }
}
