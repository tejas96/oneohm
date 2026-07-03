import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentEntityType } from '@tejas96/shared/types';

import { BomService } from '../../bom/services/bom.service';
import { OrganizationService } from '../../organizations/services/organization.service';
import type { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectService } from '../../projects/services/project.service';
import type { ReportEngineContext } from '../registry/report-plugin.interface';

export interface ProjectReportRawData {
  organizationName: string;
  project: ProjectEntity;
  panelSerialNumbers: string[];
}

@Injectable()
export class BaseProjectReportProvider {
  constructor(
    private readonly projectService: ProjectService,
    private readonly organizationService: OrganizationService,
    private readonly bomService: BomService,
  ) {}

  async fetch(ctx: ReportEngineContext): Promise<ProjectReportRawData> {
    if (ctx.entityType !== DocumentEntityType.PROJECT) {
      throw new BadRequestException(
        `Reports only support entityType=project, got ${ctx.entityType}`,
      );
    }

    const project = await this.projectService.findById(ctx.entityId, ctx.organizationId);
    const org = await this.organizationService.findById(ctx.organizationId);

    const bom = await this.bomService.findByEntity(ctx.organizationId, 'project', ctx.entityId);
    const panelSerialNumbers =
      bom?.items?.map((item) => item.serialNumber).filter((s): s is string => !!s?.trim()) ?? [];

    return {
      organizationName: org.name ?? '',
      project,
      panelSerialNumbers,
    };
  }
}
