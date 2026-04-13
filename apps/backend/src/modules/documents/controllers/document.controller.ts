import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  BulkCreateDocumentDto,
  CreateDocumentDto,
  DocumentResponseDto,
  QueryDocumentsDto,
  UpdateDocumentDto,
} from '../dto';
import { DocumentService } from '../services/document.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a document record' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DocumentResponseDto })
  async create(
    @OrganizationContext() organizationId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    dto.organizationId = organizationId;
    const document = await this.documentService.create(dto, currentUser.id);
    return toDto(DocumentResponseDto, document);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Batch-create document records' })
  @ApiResponse({ status: HttpStatus.CREATED, type: [DocumentResponseDto] })
  async createBulk(
    @OrganizationContext() organizationId: string,
    @Body() dto: BulkCreateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto[]> {
    for (const doc of dto.documents) {
      doc.organizationId = organizationId;
    }
    const documents = await this.documentService.createBulk(dto.documents, currentUser.id);
    return toDtoArray(DocumentResponseDto, documents);
  }

  @Get()
  @ApiOperation({ summary: 'List documents by entity with filters' })
  @ApiResponse({ status: HttpStatus.OK, type: [DocumentResponseDto] })
  async findAll(
    @OrganizationContext() organizationId: string,
    @Query() queryDto: QueryDocumentsDto,
  ): Promise<DocumentResponseDto[]> {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 50;

    // Property-wide query (all entity types for a property)
    if (queryDto.propertyId) {
      const docs = await this.documentService.findByProperty(queryDto.propertyId, organizationId, {
        entityType: queryDto.entityType,
        category: queryDto.category,
        tag: queryDto.tag,
      });
      return toDtoArray(DocumentResponseDto, docs);
    }

    // Batch query by entityIds
    if (queryDto.entityType && queryDto.entityIds) {
      const ids = queryDto.entityIds.split(',').map((id) => id.trim());
      const docs = await this.documentService.findByEntityBatch(
        queryDto.entityType,
        ids,
        organizationId,
      );
      return toDtoArray(DocumentResponseDto, docs);
    }

    // Single entity query
    if (queryDto.entityType && queryDto.entityId) {
      const docs = await this.documentService.findByEntity(
        queryDto.entityType,
        queryDto.entityId,
        organizationId,
        { tag: queryDto.tag, category: queryDto.category },
      );
      return toDtoArray(DocumentResponseDto, docs);
    }

    const [docs] = await this.documentService.findByOrganization(
      organizationId,
      {
        entityType: queryDto.entityType,
        category: queryDto.category,
        tag: queryDto.tag,
      },
      page,
      limit,
    );
    return toDtoArray(DocumentResponseDto, docs);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single document' })
  @ApiResponse({ status: HttpStatus.OK, type: DocumentResponseDto })
  async findById(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.findById(id, organizationId);
    return toDto(DocumentResponseDto, document);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document tag/metadata' })
  @ApiResponse({ status: HttpStatus.OK, type: DocumentResponseDto })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.update(id, dto, currentUser.id, organizationId);
    return toDto(DocumentResponseDto, document);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document (soft by default, permanent with ?permanent=true)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ): Promise<void> {
    if (permanent === 'true') {
      await this.documentService.hardDelete(id, organizationId);
    } else {
      await this.documentService.delete(id, organizationId);
    }
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL (placeholder)' })
  @ApiResponse({ status: HttpStatus.OK })
  async download(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string }> {
    const document = await this.documentService.findById(id, organizationId);
    return { url: document.fileUrl };
  }
}
