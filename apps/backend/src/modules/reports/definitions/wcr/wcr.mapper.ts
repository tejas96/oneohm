import { Injectable } from '@nestjs/common';
import { type WcrViewModel, WCR_DEFAULT_FIELDS } from '@tejas96/shared/reports';

import type { ProjectReportRawData } from '../../providers/base-project-report.provider';
import type { ReportMapper } from '../../registry/report-plugin.interface';
import { getQuoteSnapshot, getSystemSizeKw } from '../../utils/quote-snapshot.util';
import { customerDisplayName, formatPropertyAddress, str } from '../../utils/report.utils';

@Injectable()
export class WcrMapper implements ReportMapper<ProjectReportRawData, WcrViewModel> {
  toViewModel({ companyName, project }: ProjectReportRawData): WcrViewModel {
    const fields = { ...WCR_DEFAULT_FIELDS };
    const property = project.property;
    const snapshot = getQuoteSnapshot(project);
    const panel = snapshot?.calculation?.panels?.[0];
    const inverters = snapshot?.calculation?.inverters?.inverters ?? [];
    const kw = getSystemSizeKw(project);

    fields.vendor_name = companyName;
    fields.consumer_name = customerDisplayName(property);
    fields.consumer_number = str(property.consumerNumber);
    fields.site_address = formatPropertyAddress(property);
    fields.sanctioned_capacity_kw = str(property.sanctionedLoad);
    fields.installed_capacity_kw = str(kw);

    if (panel) {
      fields.module_make = str(panel.brand);
      fields.module_model_number = str(panel.name);
      fields.module_wattage = str(panel.wattagePerPanel);
      fields.module_count = str(panel.quantity);
      const totalWp = (panel.wattagePerPanel ?? 0) * (panel.quantity ?? 0);
      fields.total_capacity_kwp = totalWp > 0 ? str(totalWp / 1000) : '';
      const pw = panel.productWarrantyYears;
      const perf = panel.performanceWarrantyYears;
      fields.module_warranty =
        pw || perf ? `${pw ?? ''}${pw && perf ? '+' : ''}${perf ?? ''} Years`.trim() : '';
    }

    /*
      The form carries one field per fact, so a mixed set is joined into it.
      Taking the first entry — which this did — printed a 12 kW Sungrow on a
      system that also carries a 6 kW Deye, and understated the rating by a
      third, on a document filed with the utility.
    */
    if (inverters.length > 0) {
      fields.inverter_make_model = inverters
        .map((inv) =>
          `${[inv.brand, inv.name].filter(Boolean).join(' ')} ${inv.capacityKw} kW × ${inv.quantity}`.trim(),
        )
        .join(', ');
      const totalCapacityKw = inverters.reduce(
        (sum, inv) => sum + (inv.capacityKw ?? 0) * (inv.quantity ?? 0),
        0,
      );
      fields.inverter_rating = str(totalCapacityKw);
      fields.inverter_capacity = str(totalCapacityKw);
    }

    return fields;
  }
}
