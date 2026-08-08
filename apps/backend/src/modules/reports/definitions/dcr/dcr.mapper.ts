import { Injectable } from '@nestjs/common';
import { type DcrViewModel, DCR_DEFAULT_FIELDS } from '@tejas96/shared/reports';

import type { ProjectReportRawData } from '../../providers/base-project-report.provider';
import type { ReportMapper } from '../../registry/report-plugin.interface';
import { getQuoteSnapshot, getSystemSizeKw } from '../../utils/quote-snapshot.util';
import { customerDisplayName, formatPropertyAddress, str } from '../../utils/report.utils';

@Injectable()
export class DcrMapper implements ReportMapper<ProjectReportRawData, DcrViewModel> {
  toViewModel({
    companyName,
    project,
    panelSerialNumbers,
  }: ProjectReportRawData): DcrViewModel {
    const fields = { ...DCR_DEFAULT_FIELDS };
    const property = project.property;
    const snapshot = getQuoteSnapshot(project);
    const panel = snapshot?.calculation?.panels?.[0];
    const kw = getSystemSizeKw(project);

    fields.vendor_name = companyName;
    fields.capacity_kw = str(kw);
    fields.consumer_name = customerDisplayName(property);
    fields.consumer_address = formatPropertyAddress(property);
    fields.application_number = '';

    if (panel) {
      fields.pv_module_make = str(panel.brand);
      fields.number_of_pv_modules = str(panel.quantity);
      fields.pv_module_capacities = str(panel.wattagePerPanel);
    }

    if (panelSerialNumbers.length) {
      fields.pv_module_serial_numbers = panelSerialNumbers.join(', ');
    }

    return fields;
  }
}
