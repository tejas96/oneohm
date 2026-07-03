import { Injectable, NotFoundException } from '@nestjs/common';
import { getReportCatalogEntries, type ReportCatalogEntry } from '@tejas96/shared/reports';

import type { ReportPlugin } from './report-plugin.interface';
import { AnnexureProformaAReportPlugin } from '../definitions/annexure-proforma-a/annexure-proforma-a.plugin';
import { DcrReportPlugin } from '../definitions/dcr/dcr.plugin';
import { NetMeteringAgreementReportPlugin } from '../definitions/net-metering-agreement/net-metering-agreement.plugin';
import { WcrReportPlugin } from '../definitions/wcr/wcr.plugin';

@Injectable()
export class ReportRegistryService {
  private readonly plugins = new Map<string, ReportPlugin<unknown, Record<string, string>>>();

  constructor(
    wcr: WcrReportPlugin,
    annexure: AnnexureProformaAReportPlugin,
    netMetering: NetMeteringAgreementReportPlugin,
    dcr: DcrReportPlugin,
  ) {
    for (const plugin of [wcr, annexure, netMetering, dcr]) {
      if (this.plugins.has(plugin.id)) {
        throw new Error(`Duplicate report plugin id: ${plugin.id}`);
      }
      this.plugins.set(plugin.id, plugin);
    }
  }

  get(id: string): ReportPlugin<unknown, Record<string, string>> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new NotFoundException(`Report not found: ${id}`);
    }
    return plugin;
  }

  list(): ReportCatalogEntry[] {
    return getReportCatalogEntries();
  }
}
