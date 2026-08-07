import { BadRequestException, Injectable } from '@nestjs/common';
import { COMPANY } from '@tejas96/shared/constants';
import { DocumentEntityType } from '@tejas96/shared/types';

import { BomService } from '../../bom/services/bom.service';
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
    private readonly bomService: BomService,
  ) {}

  async fetch(ctx: ReportEngineContext): Promise<ProjectReportRawData> {
    if (ctx.entityType !== DocumentEntityType.PROJECT) {
      throw new BadRequestException(
        `Reports only support entityType=project, got ${ctx.entityType}`,
      );
    }

    const project = await this.projectService.findById(ctx.entityId);

    const bom = await this.bomService.findByEntity('project', ctx.entityId);
    const panelSerialNumbers =
      bom?.items?.map((item) => item.serialNumber).filter((s): s is string => !!s?.trim()) ?? [];

    return {
      organizationName: COMPANY.name,
      project,
      panelSerialNumbers,
    };
  }
}
