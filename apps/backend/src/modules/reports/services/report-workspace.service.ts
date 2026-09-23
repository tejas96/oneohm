import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  applyFactPatch,
  type FactKey,
  getMissingFacts,
  getReportDefinition,
  getReportStatus,
  isPendingStatus,
  REPORT_DEFINITIONS,
  REPORT_FACTS,
  type ReportDefinition,
  type ReportFact,
  type ReportRenderResult,
  type ReportStatusResult,
  type ReportWorkspace,
} from '@tejas96/shared/reports';
import { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import { BomReadService } from '../../bom/services/bom-read.service';
import type { DocumentEntity } from '../../documents/entities/document.entity';
import { DocumentService } from '../../documents/services/document.service';
import type { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { ProjectService } from '../../projects/services/project.service';
import { StorageService } from '../../storage/services/storage.service';
import type { ReportFileRefDto } from '../dto/report-workspace.dto';
import { hashReportFacts, pickReportFacts } from '../facts/facts-hash';
import { resolveFacts } from '../facts/resolve-facts';
import { TemplateRendererService } from '../renderer/template-renderer.service';

const REPORT_TAGS = new Set<string>(REPORT_DEFINITIONS.map((definition) => definition.documentTag));

function templateFileFor(definition: ReportDefinition): string {
  return `definitions/${definition.id}/templates/${definition.id}.hbs`;
}

/** Newest filed report document per tag. Hand uploads with the same tag do not count. */
function latestFiledByTag(docs: DocumentEntity[]): Map<string, DocumentEntity> {
  const sorted = docs
    .filter((doc) => doc.category === DocumentCategory.REPORT && REPORT_TAGS.has(doc.tag))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const byTag = new Map<string, DocumentEntity>();
  for (const doc of sorted) if (!byTag.has(doc.tag)) byTag.set(doc.tag, doc);
  return byTag;
}

function statusOf(
  definition: ReportDefinition,
  facts: Record<string, string>,
  filedDoc: DocumentEntity | undefined,
): ReportStatusResult {
  const meta = filedDoc?.metadata as { factsHash?: string; templateVersion?: number } | undefined;
  return getReportStatus(
    definition,
    facts,
    filedDoc ? { factsHash: meta?.factsHash, templateVersion: meta?.templateVersion } : null,
    hashReportFacts(definition, facts),
  );
}

@Injectable()
export class ReportWorkspaceService {
  private readonly logger = new Logger(ReportWorkspaceService.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRepository: ProjectRepository,
    private readonly bomReadService: BomReadService,
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  async getWorkspace(projectId: string): Promise<ReportWorkspace> {
    const { project, facts } = await this.load(projectId);
    const docs = await this.documentService.findByEntity(DocumentEntityType.PROJECT, projectId);
    const filedByTag = latestFiledByTag(docs);

    const usedBy = new Map<string, string[]>();
    for (const definition of REPORT_DEFINITIONS) {
      for (const { key } of definition.facts) {
        usedBy.set(key, [...(usedBy.get(key) ?? []), definition.id]);
      }
    }

    const reports = REPORT_DEFINITIONS.map((definition) => {
      const filedDoc = filedByTag.get(definition.documentTag);
      const { status, missing } = statusOf(definition, facts, filedDoc);
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        status,
        missing,
        pages: definition.pages,
        filed: filedDoc
          ? {
              documentId: filedDoc.id,
              fileUrl: filedDoc.fileUrl,
              fileName: filedDoc.fileName,
              filedAt: new Date(filedDoc.createdAt).toISOString(),
            }
          : null,
      };
    });

    return {
      projectId,
      customerId: project.property.customerId,
      propertyId: project.propertyId,
      quoteId: project.quote.id,
      facts: (REPORT_FACTS as readonly ReportFact[])
        .filter((fact) => usedBy.has(fact.key))
        .map((fact) => ({
          key: fact.key as FactKey,
          label: fact.label,
          type: fact.type,
          group: fact.group,
          source: fact.source,
          placeholder: fact.placeholder,
          editAt: fact.editAt,
          value: facts[fact.key as FactKey] ?? '',
          usedBy: usedBy.get(fact.key) ?? [],
        })),
      reports,
      pendingCount: reports.filter((report) => isPendingStatus(report.status)).length,
    };
  }

  async updateFacts(projectId: string, patch: Record<string, unknown>): Promise<ReportWorkspace> {
    const project = await this.projectService.findById(projectId);
    const { next, errors } = applyFactPatch(project.reportFacts ?? {}, patch);
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({ message: Object.values(errors).join('; '), errors });
    }
    await this.projectRepository.update(projectId, { reportFacts: next });
    return this.getWorkspace(projectId);
  }

  async render(projectId: string, reportId: string): Promise<ReportRenderResult> {
    const definition = this.definition(reportId);
    const { facts } = await this.load(projectId);
    return {
      html: this.templateRenderer.render(templateFileFor(definition), facts),
      pages: definition.pages,
    };
  }

  async file(
    projectId: string,
    reportId: string,
    file: ReportFileRefDto,
    userId: string,
  ): Promise<{ documentId: string; fileUrl: string }> {
    const definition = this.definition(reportId);
    const { facts } = await this.load(projectId);

    const missing = getMissingFacts(definition, facts);
    if (missing.length > 0) {
      throw new BadRequestException(
        `${definition.name} is missing: ${missing.map((m) => m.label).join(', ')}`,
      );
    }
    await this.validateUploadedFile(projectId, reportId, file);

    const document = await this.documentService.create(
      {
        entityType: DocumentEntityType.PROJECT,
        entityId: projectId,
        category: DocumentCategory.REPORT,
        tag: definition.documentTag,
        fileName: `${definition.name}.pdf`,
        fileUrl: file.publicUrl,
        fileSizeBytes: file.fileSizeBytes,
        mimeType: 'application/pdf',
        metadata: {
          reportFacts: pickReportFacts(definition, facts),
          factsHash: hashReportFacts(definition, facts),
          templateVersion: definition.templateVersion,
        },
      },
      userId,
    );

    await this.purgeOlder(projectId, definition.documentTag, document.id);
    this.logger.log(`Filed ${reportId} for project ${projectId}`);
    return { documentId: document.id, fileUrl: file.publicUrl };
  }

  async pendingCounts(projectIds: string[]): Promise<Record<string, number>> {
    if (projectIds.length === 0) return {};

    const [projects, serials, docs] = await Promise.all([
      this.projectRepository.findByIdsForReports(projectIds),
      this.bomReadService.getPanelSerialsByProjects(projectIds),
      this.documentService.findByEntityBatch(DocumentEntityType.PROJECT, projectIds),
    ]);

    const docsByProject = new Map<string, DocumentEntity[]>();
    for (const doc of docs) {
      docsByProject.set(doc.entityId, [...(docsByProject.get(doc.entityId) ?? []), doc]);
    }

    const counts: Record<string, number> = {};
    for (const project of projects) {
      const facts = resolveFacts({ project, panelSerials: serials.get(project.id) ?? [] });
      const filedByTag = latestFiledByTag(docsByProject.get(project.id) ?? []);
      counts[project.id] = REPORT_DEFINITIONS.filter((definition) =>
        isPendingStatus(statusOf(definition, facts, filedByTag.get(definition.documentTag)).status),
      ).length;
    }
    return counts;
  }

  private definition(reportId: string): ReportDefinition {
    const definition = getReportDefinition(reportId);
    if (!definition) throw new NotFoundException(`Report not found: ${reportId}`);
    return definition;
  }

  private async load(
    projectId: string,
  ): Promise<{ project: ProjectEntity; facts: Record<FactKey, string> }> {
    const project = await this.projectService.findById(projectId);
    const panelSerials = await this.bomReadService.getPanelSerials(projectId);
    return { project, facts: resolveFacts({ project, panelSerials }) };
  }

  private async validateUploadedFile(
    projectId: string,
    reportId: string,
    file: ReportFileRefDto,
  ): Promise<void> {
    const expectedPrefix = `project/${projectId}/${reportId}/`;
    if (!file.fileKey.startsWith(expectedPrefix)) {
      throw new BadRequestException(`Invalid file key: expected prefix "${expectedPrefix}"`);
    }
    if (this.storageService.extractFileKeyFromUrl(file.publicUrl) !== file.fileKey) {
      throw new BadRequestException('Public URL does not match the uploaded file key');
    }
    if (!(await this.storageService.fileExists(file.fileKey))) {
      throw new BadRequestException('Uploaded report file was not found in storage');
    }
  }

  private async purgeOlder(projectId: string, tag: string, keepId: string): Promise<void> {
    const docs = await this.documentService.findByEntity(DocumentEntityType.PROJECT, projectId, {
      tag,
    });
    const older = docs.filter(
      (doc) => doc.id !== keepId && doc.category === DocumentCategory.REPORT,
    );
    await Promise.allSettled(
      older.map(async (doc) => {
        const fileKey = this.storageService.extractFileKeyFromUrl(doc.fileUrl);
        if (fileKey) {
          try {
            await this.storageService.deleteFile(fileKey);
          } catch {
            /* file may already be gone */
          }
        }
        await this.documentService.hardDelete(doc.id);
      }),
    );
  }
}
