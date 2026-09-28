import {
  BadRequestException,
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
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ResellerAllowed, ResellerOwnershipService, ResellerScope } from '../../../common/reseller';
import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  BulkCreateDocumentDto,
  CreateDocumentDto,
  DocumentResponseDto,
  PrintDocumentsDto,
  QueryDocumentsDto,
  UpdateDocumentDto,
} from '../dto';
import { DocumentPrintService } from '../services/document-print.service';
import { DocumentService } from '../services/document.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly documentPrintService: DocumentPrintService,
    private readonly ownership: ResellerOwnershipService,
  ) {}

  private parseCsv(value?: string): string[] | undefined {
    if (!value) return undefined;
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? [...new Set(items)] : undefined;
  }

  @ResellerAllowed()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a document record' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DocumentResponseDto })
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
    @ResellerScope() resellerId?: string,
  ): Promise<DocumentResponseDto> {
    if (resellerId) {
      await this.ownership.assertOwnsDocumentParent(dto.entityType, dto.entityId, resellerId);
    }
    const document = await this.documentService.create(dto, currentUser.id);
    return toDto(DocumentResponseDto, document);
  }

  @ResellerAllowed()
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Batch-create document records' })
  @ApiResponse({ status: HttpStatus.CREATED, type: [DocumentResponseDto] })
  async createBulk(
    @Body() dto: BulkCreateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
    @ResellerScope() resellerId?: string,
  ): Promise<DocumentResponseDto[]> {
    if (resellerId) {
      for (const doc of dto.documents) {
        await this.ownership.assertOwnsDocumentParent(doc.entityType, doc.entityId, resellerId);
      }
    }
    const documents = await this.documentService.createBulk(dto.documents, currentUser.id);
    return toDtoArray(DocumentResponseDto, documents);
  }

  @Post('print')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join documents into one PDF, in the order given, for printing' })
  @ApiResponse({ status: HttpStatus.OK, description: 'application/pdf' })
  async print(@Body() dto: PrintDocumentsDto): Promise<StreamableFile> {
    const pdf = await this.documentPrintService.bundle(dto.ids);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: 'inline; filename="documents.pdf"',
    });
  }

  @ResellerAllowed()
  @Get()
  @ApiOperation({ summary: 'List documents by entity with filters' })
  @ApiResponse({ status: HttpStatus.OK, type: [DocumentResponseDto] })
  async findAll(
    @Query() queryDto: QueryDocumentsDto,
    @ResellerScope() resellerId?: string,
  ): Promise<DocumentResponseDto[]> {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 50;
    const tags = this.parseCsv(queryDto.tags);

    if (resellerId) {
      // A reseller may only ask for one customer's or property's documents,
      // never the property-wide, batch, or org-wide listings — those have no
      // single parent to check ownership against.
      if (!queryDto.entityType || !queryDto.entityId) {
        throw new BadRequestException('entityType and entityId are required.');
      }
      await this.ownership.assertOwnsDocumentParent(queryDto.entityType, queryDto.entityId, resellerId);
      const docs = await this.documentService.findByEntity(queryDto.entityType, queryDto.entityId, {
        tag: queryDto.tag,
        tags,
        category: queryDto.category,
      });
      return toDtoArray(DocumentResponseDto, docs);
    }

    // Property-wide query (all entity types for a property)
    if (queryDto.propertyId) {
      const docs = await this.documentService.findByProperty(queryDto.propertyId, {
        entityType: queryDto.entityType,
        category: queryDto.category,
        tag: queryDto.tag,
        tags,
      });
      return toDtoArray(DocumentResponseDto, docs);
    }

    // Batch query by entityIds
    if (queryDto.entityType && queryDto.entityIds) {
      const ids = queryDto.entityIds.split(',').map((id) => id.trim());
      const docs = await this.documentService.findByEntityBatch(queryDto.entityType, ids);
      return toDtoArray(DocumentResponseDto, docs);
    }

    // Single entity query
    if (queryDto.entityType && queryDto.entityId) {
      const docs = await this.documentService.findByEntity(queryDto.entityType, queryDto.entityId, {
        tag: queryDto.tag,
        tags,
        category: queryDto.category,
      });
      return toDtoArray(DocumentResponseDto, docs);
    }

    const [docs] = await this.documentService.findByOrganization(
      {
        entityType: queryDto.entityType,
        category: queryDto.category,
        tag: queryDto.tag,
        tags,
      },
      page,
      limit,
    );
    return toDtoArray(DocumentResponseDto, docs);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single document' })
  @ApiResponse({ status: HttpStatus.OK, type: DocumentResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<DocumentResponseDto> {
    const document = await this.documentService.findById(id);
    return toDto(DocumentResponseDto, document);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document tag/metadata' })
  @ApiResponse({ status: HttpStatus.OK, type: DocumentResponseDto })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.update(id, dto, currentUser.id);
    return toDto(DocumentResponseDto, document);
  }

  @ResellerAllowed()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document (soft by default, permanent with ?permanent=true)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
    @ResellerScope() resellerId?: string,
  ): Promise<void> {
    if (resellerId) await this.ownership.assertOwns('document', id, resellerId);
    if (permanent === 'true') {
      await this.documentService.hardDelete(id);
    } else {
      await this.documentService.delete(id);
    }
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL (placeholder)' })
  @ApiResponse({ status: HttpStatus.OK })
  async download(@Param('id', ParseUUIDPipe) id: string): Promise<{ url: string }> {
    const document = await this.documentService.findById(id);
    return { url: document.fileUrl };
  }
}
