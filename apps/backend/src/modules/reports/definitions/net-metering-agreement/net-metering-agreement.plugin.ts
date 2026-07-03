import { Injectable } from '@nestjs/common';
import { NET_METERING_AGREEMENT_SCHEMA } from '@tejas96/shared/reports';

import { NetMeteringAgreementMapper } from './net-metering-agreement.mapper';
import {
  type ProjectReportRawData,
  BaseProjectReportProvider,
} from '../../providers/base-project-report.provider';
import type { ReportPlugin } from '../../registry/report-plugin.interface';

@Injectable()
export class NetMeteringAgreementReportPlugin
  implements ReportPlugin<ProjectReportRawData, Record<string, string>>
{
  readonly id = NET_METERING_AGREEMENT_SCHEMA.id;
  readonly schema = NET_METERING_AGREEMENT_SCHEMA;
  readonly templateFile = 'definitions/net-metering-agreement/templates/net-metering-agreement.hbs';

  constructor(
    private readonly baseProvider: BaseProjectReportProvider,
    public readonly mapper: NetMeteringAgreementMapper,
  ) {}

  get provider() {
    return this.baseProvider;
  }
}
