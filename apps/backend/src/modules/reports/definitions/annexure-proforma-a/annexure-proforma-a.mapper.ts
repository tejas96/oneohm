import { Injectable } from '@nestjs/common';
import {
  type AnnexureProformaAViewModel,
  ANNEXURE_PROFORMA_A_DEFAULT_FIELDS,
} from '@tejas96/shared/reports';

import type { ProjectReportRawData } from '../../providers/base-project-report.provider';
import type { ReportMapper } from '../../registry/report-plugin.interface';
import { getQuoteSnapshot, getSystemSizeKw } from '../../utils/quote-snapshot.util';
import { customerDisplayName, formatPropertyAddress, str } from '../../utils/report.utils';

@Injectable()
export class AnnexureProformaAMapper
  implements ReportMapper<ProjectReportRawData, AnnexureProformaAViewModel>
{
  toViewModel({ organizationName, project }: ProjectReportRawData): AnnexureProformaAViewModel {
    const fields = { ...ANNEXURE_PROFORMA_A_DEFAULT_FIELDS };
    const property = project.property;
    const snapshot = getQuoteSnapshot(project);
    const panel = snapshot?.calculation?.panels?.[0];
    const inverter = snapshot?.calculation?.inverters?.inverters?.[0];
    const kw = getSystemSizeKw(project);

    fields.vendor_name = organizationName;
    fields.consumer_name = customerDisplayName(property);
    fields.consumer_number = str(property.consumerNumber);
    fields.mobile_number = str(property.customer?.phone);
    fields.email = str(property.customer?.email);
    fields.address_of_installation = formatPropertyAddress(property);
    fields.sanctioned_capacity_kw = str(property.sanctionedLoad);
    fields.re_installed_capacity_rooftop_kw = str(kw);
    fields.district = str(property.city);
    fields.state = str(property.state);

    if (panel) {
      fields.no_of_pv_modules = str(panel.quantity);
      const moduleKw =
        panel.wattagePerPanel && panel.quantity
          ? (panel.wattagePerPanel * panel.quantity) / 1000
          : undefined;
      fields.module_capacity_kw = str(moduleKw);
    }

    if (inverter) {
      fields.inverter_capacity_kw = str(inverter.capacityKw);
      fields.inverter_make = str(inverter.brand);
    }

    return fields;
  }
}
