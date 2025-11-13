import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ComplianceStatus } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';

import {
  CreateComplianceApplicationDto,
  UpdateComplianceApplicationDto,
  ComplianceApplicationResponseDto,
} from '../dto';
import { ComplianceApplicationRepository } from '../repositories/compliance-application.repository';

@Injectable()
export class ComplianceApplicationService {
  constructor(private readonly repository: ComplianceApplicationRepository) {}

  async create(createDto: CreateComplianceApplicationDto): Promise<ComplianceApplicationResponseDto> {
    const applicationNumber = await this.repository.generateApplicationNumber();
    const applicationDate = createDto.applicationDate || new Date();

    const application = await this.repository.create({
      ...createDto,
      applicationNumber,
      applicationDate,
      status: createDto.status || ComplianceStatus.DRAFT,
    });

    return plainToInstance(ComplianceApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<ComplianceApplicationResponseDto[]> {
    const applications = await this.repository.findAll();
    return plainToInstance(ComplianceApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: string): Promise<ComplianceApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Compliance application with ID ${id} not found`);
    }
    return plainToInstance(ComplianceApplicationResponseDto, application, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateDto: UpdateComplianceApplicationDto): Promise<ComplianceApplicationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Compliance application with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, updateDto);
    if (!updated) {
      throw new NotFoundException(`Failed to update compliance application with ID ${id}`);
    }

    return plainToInstance(ComplianceApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Compliance application with ID ${id} not found`);
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete compliance application with ID ${id}`);
    }
  }

  async findByProject(projectId: string): Promise<ComplianceApplicationResponseDto[]> {
    const applications = await this.repository.findByProject(projectId);
    return plainToInstance(ComplianceApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async findByStatus(status: ComplianceStatus): Promise<ComplianceApplicationResponseDto[]> {
    const applications = await this.repository.findByStatus(status);
    return plainToInstance(ComplianceApplicationResponseDto, applications, {
      excludeExtraneousValues: true,
    });
  }

  async submit(id: string, submittedBy: string): Promise<ComplianceApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Compliance application with ID ${id} not found`);
    }

    if (application.status !== ComplianceStatus.DRAFT) {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    const updated = await this.repository.update(id, {
      status: ComplianceStatus.SUBMITTED,
      submittedAt: new Date(),
      submittedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to submit compliance application`);
    }

    return plainToInstance(ComplianceApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async approve(id: string, approvalDocumentPath?: string): Promise<ComplianceApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Compliance application with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, {
      status: ComplianceStatus.APPROVED,
      approvedAt: new Date(),
      approvalDocumentPath,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to approve compliance application`);
    }

    return plainToInstance(ComplianceApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async reject(id: string, rejectionReason: string): Promise<ComplianceApplicationResponseDto> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException(`Compliance application with ID ${id} not found`);
    }

    const updated = await this.repository.update(id, {
      status: ComplianceStatus.REJECTED,
      rejectionReason,
      rejectedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException(`Failed to reject compliance application`);
    }

    return plainToInstance(ComplianceApplicationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }
}
