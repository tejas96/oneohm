import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type PaginatedResponse, LookupScopeType } from '@tejas96/shared/types';

import { toDtoArray, toPaginatedResponse, toDto } from '../../../common/utils';
import {
  CreateLookupDto,
  LookupByTypeCodeResponseDto,
  LookupResponseDto,
  UpdateLookupDto,
} from '../dto';
import { type LookupFilters, LookupRepository } from '../repositories/lookup.repository';

@Injectable()
export class LookupService {
  private readonly logger = new Logger(LookupService.name);

  constructor(private readonly lookupRepository: LookupRepository) {}

  async findAll(filters?: LookupFilters): Promise<PaginatedResponse<LookupResponseDto>> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const { data, total } = await this.lookupRepository.findAll(filters);
    return toPaginatedResponse(LookupResponseDto, data, total, page, limit);
  }

  async findByTypeCode(
    typeCode: string,
    scopeType?: LookupScopeType,
    scopeId?: string,
  ): Promise<LookupByTypeCodeResponseDto[]> {
    const entities = await this.lookupRepository.findByTypeCode(typeCode, scopeType, scopeId);
    return toDtoArray(LookupByTypeCodeResponseDto, entities);
  }

  async findById(id: string): Promise<LookupResponseDto> {
    const entity = await this.lookupRepository.findById(id);
    if (!entity) throw new NotFoundException('Lookup not found');
    return toDto(LookupResponseDto, entity);
  }

  async create(dto: CreateLookupDto, createdBy?: string): Promise<LookupResponseDto> {
    const scopeType = dto.scopeType ?? LookupScopeType.GLOBAL;


    const isDuplicate = await this.lookupRepository.checkDuplicate(
      dto.typeCode,
      dto.code,
      scopeType,
      dto.scopeId,
    );
    if (isDuplicate) {
      throw new ConflictException(
        `Lookup with typeCode '${dto.typeCode}' and code '${dto.code}' already exists for this scope`,
      );
    }

    if (dto.parentId) {
      const parent = await this.lookupRepository.findById(dto.parentId);
      if (!parent) throw new BadRequestException(`parentId '${dto.parentId}' does not exist`);
    }

    if (dto.dependsOnId) {
      const dependsOn = await this.lookupRepository.findById(dto.dependsOnId);
      if (!dependsOn)
        throw new BadRequestException(`dependsOnId '${dto.dependsOnId}' does not exist`);
    }

    const entity = await this.lookupRepository.create({
      ...dto,
      scopeType,
      createdBy,
    });
    this.logger.log(`Created lookup: ${entity.id} [${entity.typeCode}/${entity.code}]`);
    return toDto(LookupResponseDto, entity);
  }

  async update(id: string, dto: UpdateLookupDto, updatedBy?: string): Promise<LookupResponseDto> {
    const existing = await this.lookupRepository.findById(id);
    if (!existing) throw new NotFoundException('Lookup not found');

    const typeCode = dto.typeCode ?? existing.typeCode;
    const code = dto.code ?? existing.code;
    const scopeType = dto.scopeType ?? existing.scopeType;
    const scopeId = dto.scopeId ?? existing.scopeId;

    if (
      dto.typeCode !== undefined ||
      dto.code !== undefined ||
      dto.scopeType !== undefined ||
      dto.scopeId !== undefined
    ) {
      const isDuplicate = await this.lookupRepository.checkDuplicate(
        typeCode,
        code,
        scopeType,
        scopeId,
        id,
      );
      if (isDuplicate) {
        throw new ConflictException(
          `Lookup with typeCode '${typeCode}' and code '${code}' already exists for this scope`,
        );
      }
    }

    if (dto.parentId) {
      const parent = await this.lookupRepository.findById(dto.parentId);
      if (!parent) throw new BadRequestException(`parentId '${dto.parentId}' does not exist`);
    }

    if (dto.dependsOnId) {
      const dependsOn = await this.lookupRepository.findById(dto.dependsOnId);
      if (!dependsOn)
        throw new BadRequestException(`dependsOnId '${dto.dependsOnId}' does not exist`);
    }

    const updated = await this.lookupRepository.update(id, { ...dto, updatedBy });
    this.logger.log(`Updated lookup: ${id}`);
    return toDto(LookupResponseDto, updated);
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const existing = await this.lookupRepository.findById(id);
    if (!existing) throw new NotFoundException('Lookup not found');
    await this.lookupRepository.softDelete(id, deletedBy);
    this.logger.log(`Soft deleted lookup: ${id}`);
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    updatedBy?: string,
  ): Promise<LookupResponseDto> {
    const existing = await this.lookupRepository.findById(id);
    if (!existing) throw new NotFoundException('Lookup not found');
    const updated = await this.lookupRepository.update(id, { isActive, updatedBy });
    this.logger.log(`Toggled lookup ${id} isActive -> ${String(isActive)}`);
    return toDto(LookupResponseDto, updated);
  }
}
