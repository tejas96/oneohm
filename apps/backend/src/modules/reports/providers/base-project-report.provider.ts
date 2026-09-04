import { BadRequestException, Injectable } from '@nestjs/common';
import { COMPANY } from '@tejas96/shared/constants';
import { DocumentEntityType } from '@tejas96/shared/types';

import { BomReadService } from '../../bom/services/bom-read.service';
import type { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectService } from '../../projects/services/project.service';
import type { ReportEngineContext } from '../registry/report-plugin.interface';

export interface ProjectReportRawData {
  companyName: string;
  project: ProjectEntity;
  panelSerialNumbers: string[];
}

@Injectable()
export class BaseProjectReportProvider {
  constructor(
    private readonly projectService: ProjectService,
    private readonly bomReadService: BomReadService,
  ) {}

  async fetch(ctx: ReportEngineContext): Promise<ProjectReportRawData> {
    if (ctx.entityType !== DocumentEntityType.PROJECT) {
      throw new BadRequestException(
        `Reports only support entityType=project, got ${ctx.entityType}`,
      );
    }

    const project = await this.projectService.findById(ctx.entityId);

    const panelSerialNumbers = await this.bomReadService.getPanelSerials(ctx.entityId);

    return {
      companyName: COMPANY.name,
      project,
      panelSerialNumbers,
    };
  }
}
