import { Injectable } from '@nestjs/common';
import { ANNEXURE_PROFORMA_A_SCHEMA } from '@tejas96/shared/reports';

import { AnnexureProformaAMapper } from './annexure-proforma-a.mapper';
import {
  type ProjectReportRawData,
  BaseProjectReportProvider,
} from '../../providers/base-project-report.provider';
import type { ReportPlugin } from '../../registry/report-plugin.interface';

@Injectable()
export class AnnexureProformaAReportPlugin
  implements ReportPlugin<ProjectReportRawData, Record<string, string>>
{
  readonly id = ANNEXURE_PROFORMA_A_SCHEMA.id;
  readonly schema = ANNEXURE_PROFORMA_A_SCHEMA;
  readonly templateFile = 'definitions/annexure-proforma-a/templates/annexure-proforma-a.hbs';

  constructor(
    private readonly baseProvider: BaseProjectReportProvider,
    public readonly mapper: AnnexureProformaAMapper,
  ) {}

  get provider() {
    return this.baseProvider;
  }
}
