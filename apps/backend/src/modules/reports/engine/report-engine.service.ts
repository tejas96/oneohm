import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { getReportCompleteness } from '@tejas96/shared/reports';
import { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import { FieldResolverService } from './field-resolver.service';
import { DocumentService } from '../../documents/services/document.service';
import { StorageService } from '../../storage/services/storage.service';
import type { ReportEngineContext } from '../registry/report-plugin.interface';
import { ReportRegistryService } from '../registry/report-registry.service';
import { TemplateRendererService } from '../renderer/template-renderer.service';

export interface InitializeOptions {
  ignoreSavedDraft?: boolean;
}

export interface ReportSaveFileRef {
  fileKey: string;
  publicUrl: string;
  fileSizeBytes: number;
}

export interface InitializeResult {
  fields: Record<string, string>;
  html: string;
  savedDocumentId?: string;
}

@Injectable()
export class ReportEngineService {
  private readonly logger = new Logger(ReportEngineService.name);

  constructor(
    private readonly registry: ReportRegistryService,
    private readonly fieldResolver: FieldResolverService,
    private readonly templateRenderer: TemplateRendererService,
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
  ) {}

  listCatalog() {
    return this.registry.list();
  }

  async getCompleteness(projectId: string, organizationId: string): Promise<any> {
    const catalog = this.registry.list();
    if (catalog.length === 0) {
      return {
        totalReports: 0,
        savedReports: 0,
        incompleteReports: 0,
        unsavedReports: 0,
        pendingCount: 0,
        reports: [],
        saved: [],
      };
    }

    const plugins = catalog.map((entry) => this.registry.get(entry.id));

    const ctx: ReportEngineContext = {
      organizationId,
      userId: '',
      entityType: DocumentEntityType.PROJECT,
      entityId: projectId,
    };

    const firstPlugin = plugins[0];
    if (!firstPlugin) {
      throw new Error('No plugins registered');
    }
    const raw = await firstPlugin.provider.fetch(ctx);

    const reportTags = plugins.map((p) => p.schema.documentTag);
    const docs = await this.documentService.findByEntity(
      DocumentEntityType.PROJECT,
      projectId,
      organizationId,
      { tags: reportTags },
    );

    const docsMap = new Map<string, any>();
    for (const doc of docs) {
      if (!docsMap.has(doc.tag)) {
        docsMap.set(doc.tag, doc);
      }
    }

    let savedReports = 0;
    let incompleteReports = 0;
    let unsavedReports = 0;

    const reportsSummary = plugins.map((plugin) => {
      const savedDoc = docsMap.get(plugin.schema.documentTag);
      const isSaved = !!savedDoc;

      if (isSaved) {
        savedReports++;
      } else {
        unsavedReports++;
      }

      const defaults = plugin.mapper.toViewModel(raw);
      let draft: Record<string, string> | undefined;
      if (savedDoc?.metadata?.reportFields) {
        draft = savedDoc.metadata.reportFields as Record<string, string>;
      }

      const mergedFields = this.fieldResolver.mergeFields(defaults, draft);
      const completeness = getReportCompleteness(plugin.schema, mergedFields);

      if (isSaved && !completeness.isComplete) {
        incompleteReports++;
      }

      return {
        ...completeness,
        isSaved,
        savedDocumentId: savedDoc?.id,
      };
    });

    const pendingCount = unsavedReports + incompleteReports;

    return {
      totalReports: plugins.length,
      savedReports,
      incompleteReports,
      unsavedReports,
      pendingCount,
      reports: reportsSummary,
      saved: docs,
    };
  }

  async initialize(
    reportId: string,
    ctx: ReportEngineContext,
    options?: InitializeOptions,
  ): Promise<InitializeResult> {
    const plugin = this.registry.get(reportId);
    const raw = await plugin.provider.fetch(ctx);
    const defaults = plugin.mapper.toViewModel(raw);

    let draft: Record<string, string> | undefined;
    let savedDocumentId: string | undefined;

    if (!options?.ignoreSavedDraft) {
      const saved = await this.loadSavedFields(ctx, plugin.schema.documentTag);
      draft = saved.draft;
      savedDocumentId = saved.savedDocumentId;
    }

    const fields = this.fieldResolver.mergeFields(defaults, draft);
    const html = this.templateRenderer.render(plugin.templateFile, fields);
    return { fields, html, savedDocumentId };
  }

  async preview(
    reportId: string,
    ctx: ReportEngineContext,
    fields: Record<string, string>,
  ): Promise<{ html: string }> {
    return this.renderPreview(reportId, ctx, fields);
  }

  async save(
    reportId: string,
    ctx: ReportEngineContext,
    fields: Record<string, string>,
    file: ReportSaveFileRef,
  ): Promise<{ documentId: string; downloadUrl: string }> {
    const plugin = this.registry.get(reportId);
    await plugin.provider.fetch(ctx);
    const sanitized = this.fieldResolver.validateFields(reportId, fields, { ignoreRequired: true });
    await this.validateUploadedFile(ctx, reportId, file);

    const document = await this.documentService.create(
      {
        organizationId: ctx.organizationId,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        category: DocumentCategory.REPORT,
        tag: plugin.schema.documentTag,
        fileName: `${plugin.schema.name}.pdf`,
        fileUrl: file.publicUrl,
        fileSizeBytes: file.fileSizeBytes,
        mimeType: 'application/pdf',
        metadata: { reportFields: sanitized },
      },
      ctx.userId,
    );

    await this.purgeExistingDocuments(ctx, plugin.schema.documentTag, document.id);

    this.logger.log(`Saved report ${reportId} for ${ctx.entityType}/${ctx.entityId}`);

    return { documentId: document.id, downloadUrl: file.publicUrl };
  }

  private async renderPreview(
    reportId: string,
    ctx: ReportEngineContext,
    fields: Record<string, string>,
  ): Promise<{ html: string }> {
    const plugin = this.registry.get(reportId);
    await plugin.provider.fetch(ctx);
    const sanitized = this.fieldResolver.validateFields(reportId, fields, { ignoreRequired: true });
    const html = this.templateRenderer.render(plugin.templateFile, sanitized);
    return { html };
  }

  private async validateUploadedFile(
    ctx: ReportEngineContext,
    reportId: string,
    file: ReportSaveFileRef,
  ): Promise<void> {
    const expectedPrefix = `project/${ctx.entityId}/${reportId}/`;
    if (!file.fileKey.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        `Invalid file key for report upload: expected prefix "${expectedPrefix}"`,
      );
    }

    const extractedKey = this.storageService.extractFileKeyFromUrl(file.publicUrl);
    if (!extractedKey || extractedKey !== file.fileKey) {
      throw new BadRequestException('Public URL does not match the uploaded file key');
    }

    const exists = await this.storageService.fileExists(file.fileKey);
    if (!exists) {
      throw new BadRequestException('Uploaded report file was not found in storage');
    }
  }

  private async loadSavedFields(
    ctx: ReportEngineContext,
    tag: string,
  ): Promise<{ draft?: Record<string, string>; savedDocumentId?: string }> {
    if (ctx.entityType !== DocumentEntityType.PROJECT) {
      return {};
    }

    const docs = await this.documentService.findByEntity(
      ctx.entityType,
      ctx.entityId,
      ctx.organizationId,
      { tag },
    );

    const latest = docs[0];
    if (!latest?.metadata?.reportFields) {
      return {};
    }

    const reportFields = latest.metadata.reportFields as Record<string, string>;
    return { draft: reportFields, savedDocumentId: latest.id };
  }

  private async purgeExistingDocuments(
    ctx: ReportEngineContext,
    tag: string,
    excludeDocumentId?: string,
  ): Promise<void> {
    const docs = await this.documentService.findByEntity(
      ctx.entityType,
      ctx.entityId,
      ctx.organizationId,
      { tag },
    );

    const toPurge = excludeDocumentId ? docs.filter((doc) => doc.id !== excludeDocumentId) : docs;

    await Promise.allSettled(
      toPurge.map(async (doc) => {
        const fileKey = this.storageService.extractFileKeyFromUrl(doc.fileUrl);
        if (fileKey) {
          try {
            await this.storageService.deleteFile(fileKey);
          } catch {
            /* file may already be gone */
          }
        }
        await this.documentService.hardDelete(doc.id, ctx.organizationId);
      }),
    );
  }
}
