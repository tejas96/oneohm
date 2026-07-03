import { Injectable } from '@nestjs/common';
import { DCR_SCHEMA } from '@tejas96/shared/reports';

import { DcrMapper } from './dcr.mapper';
import {
  type ProjectReportRawData,
  BaseProjectReportProvider,
} from '../../providers/base-project-report.provider';
import type { ReportPlugin } from '../../registry/report-plugin.interface';

@Injectable()
export class DcrReportPlugin implements ReportPlugin<ProjectReportRawData, Record<string, string>> {
  readonly id = DCR_SCHEMA.id;
  readonly schema = DCR_SCHEMA;
  readonly templateFile = 'definitions/dcr/templates/dcr.hbs';

  constructor(
    private readonly baseProvider: BaseProjectReportProvider,
    public readonly mapper: DcrMapper,
  ) {}

  get provider() {
    return this.baseProvider;
  }
}
