import { COMPANY } from '@tejas96/shared/constants';
import { type FactKey, REPORT_FACTS, type ReportFact } from '@tejas96/shared/reports';
import { PROPERTY_TYPE_LABELS } from '@tejas96/shared/types';

import type { ProjectEntity } from '../../projects/entities/project.entity';
import { getQuoteSnapshot, getSystemSizeKw } from '../utils/quote-snapshot.util';
import { customerDisplayName, formatPropertyAddress, str } from '../utils/report.utils';

export interface ReportSource {
  /** Loaded with property, property.customer and the latest quote version. */
  project: ProjectEntity;
  panelSerials: string[];
}

/**
 * Every fact for one project, from live records plus the hand-typed store.
 *
 * Pure on purpose: the workspace and the projects-list batch both call it, and
 * a filed report's fingerprint is only comparable if both produce the same
 * string for the same data. Serials are sorted for that reason — their load
 * order differs between the two paths.
 */
export function resolveFacts({ project, panelSerials }: ReportSource): Record<FactKey, string> {
  const facts = {} as Record<FactKey, string>;
  const manual = project.reportFacts ?? {};

  for (const fact of REPORT_FACTS as readonly ReportFact[]) {
    const key = fact.key as FactKey;
    if (fact.source === 'manual') facts[key] = manual[fact.key] ?? '';
    else if (fact.source === 'fixed') facts[key] = fact.fixedValue ?? '';
    else facts[key] = '';
  }

  const property = project.property;
  const customer = property.customer;
  const snapshot = getQuoteSnapshot(project);
  const panel = snapshot?.calculation?.panels?.[0];
  const inverters = snapshot?.calculation?.inverters?.inverters ?? [];
  const kw = getSystemSizeKw(project);

  facts.vendor_name = COMPANY.legalName;

  facts.consumer_name = customerDisplayName(property);
  facts.consumer_number = str(property.consumerNumber);
  facts.consumer_phone = str(customer?.phone);
  facts.consumer_email = str(customer?.email);
  facts.consumer_aadhaar_number = str(customer?.aadhaarNumber);
  facts.site_address = formatPropertyAddress(property);
  facts.site_city = str(property.city);
  facts.site_state = str(property.state);
  facts.site_category = property.propertyType ? (PROPERTY_TYPE_LABELS[property.propertyType] ?? '') : '';
  facts.sanctioned_capacity_kw = str(property.sanctionedLoad);

  facts.installed_capacity_kw = str(kw);
  facts.installed_capacity_wp = kw != null ? str(Math.round(kw * 1000)) : '';

  if (panel) {
    facts.module_make = str(panel.brand);
    facts.module_model_number = str(panel.name);
    facts.module_wattage = str(panel.wattagePerPanel);
    facts.module_count = str(panel.quantity);
    const totalWp = (panel.wattagePerPanel ?? 0) * (panel.quantity ?? 0);
    facts.module_total_kw = totalWp > 0 ? str(totalWp / 1000) : '';
    const product = panel.productWarrantyYears;
    const performance = panel.performanceWarrantyYears;
    facts.module_warranty =
      product || performance
        ? `${product ?? ''}${product && performance ? '+' : ''}${performance ?? ''} Years`.trim()
        : '';
  }

  // A mixed inverter set is joined, never truncated to its first entry: this
  // is filed with the utility, and the first entry understated one system by a third.
  if (inverters.length > 0) {
    facts.inverter_make_model = inverters
      .map((inv) =>
        `${[inv.brand, inv.name].filter(Boolean).join(' ')} ${str(inv.capacityKw)} kW × ${str(inv.quantity)}`.trim(),
      )
      .join(', ');
    facts.inverter_make = Array.from(
      new Set(inverters.map((inv) => inv.brand).filter(Boolean)),
    ).join(', ');
    const totalKw = inverters.reduce(
      (sum, inv) => sum + (inv.capacityKw ?? 0) * (inv.quantity ?? 0),
      0,
    );
    facts.inverter_total_kw = str(totalKw);
  }

  facts.module_serial_numbers = [...panelSerials].sort().join(', ');

  return facts;
}
