import { Injectable } from '@nestjs/common';
import {
  type NetMeteringAgreementViewModel,
  NET_METERING_AGREEMENT_DEFAULT_FIELDS,
} from '@tejas96/shared/reports';

import type { ProjectReportRawData } from '../../providers/base-project-report.provider';
import type { ReportMapper } from '../../registry/report-plugin.interface';
import { getSystemSizeKw } from '../../utils/quote-snapshot.util';
import { customerDisplayName, formatPropertyAddress, str } from '../../utils/report.utils';

@Injectable()
export class NetMeteringAgreementMapper
  implements ReportMapper<ProjectReportRawData, NetMeteringAgreementViewModel>
{
  toViewModel({ project }: ProjectReportRawData): NetMeteringAgreementViewModel {
    const fields = { ...NET_METERING_AGREEMENT_DEFAULT_FIELDS };
    const property = project.property;
    const kw = getSystemSizeKw(project);

    fields.location = str(property.city);
    fields.consumer_name = customerDisplayName(property);
    fields.consumer_address = formatPropertyAddress(property);
    fields.consumer_number = str(property.consumerNumber);
    fields.installed_capacity_wp = kw != null ? str(Math.round(kw * 1000)) : '';

    const now = new Date();
    fields.day = str(now.getDate());
    fields.month = now.toLocaleString('en-US', { month: 'long' });
    fields.year = str(now.getFullYear());

    return fields;
  }
}
