import { Injectable } from '@nestjs/common';
import { WCR_SCHEMA } from '@tejas96/shared/reports';

import { WcrMapper } from './wcr.mapper';
import {
  type ProjectReportRawData,
  BaseProjectReportProvider,
} from '../../providers/base-project-report.provider';
import type { ReportPlugin } from '../../registry/report-plugin.interface';

@Injectable()
export class WcrReportPlugin implements ReportPlugin<ProjectReportRawData, Record<string, string>> {
  readonly id = WCR_SCHEMA.id;
  readonly schema = WCR_SCHEMA;
  readonly templateFile = 'definitions/wcr/templates/wcr.hbs';

  constructor(
    private readonly baseProvider: BaseProjectReportProvider,
    public readonly mapper: WcrMapper,
  ) {}

  get provider() {
    return this.baseProvider;
  }
}
