import { COMPANY } from '@tejas96/shared/constants';
import { type FactKey, REPORT_FACTS, type ReportFact } from '@tejas96/shared/reports';
import {
  CONNECTION_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  RE_ARRANGEMENT_TYPE_LABELS,
} from '@tejas96/shared/types';

import { buildDiscomLabel } from '../../discoms/utils/discom-label.util';
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
  const panels = snapshot?.calculation?.panels ?? [];
  const inverters = snapshot?.calculation?.inverters?.inverters ?? [];
  const kw = getSystemSizeKw(project);

  facts.vendor_name = COMPANY.legalName;

  facts.consumer_name = customerDisplayName(property);
  facts.consumer_number = str(property.consumerNumber);
  facts.consumer_phone = str(customer?.phone);
  facts.consumer_email = str(customer?.email);
  facts.consumer_aadhaar_number = str(customer?.aadhaarNumber);
  facts.site_address = formatPropertyAddress(property);
  facts.site_address_line = str(property.address);
  facts.site_city = str(property.city);
  facts.site_state = str(property.state);
  facts.site_pincode = str(property.pincode);
  facts.site_category = property.propertyType
    ? (PROPERTY_TYPE_LABELS[property.propertyType] ?? '')
    : '';
  facts.sanctioned_capacity_kw = str(property.sanctionedLoad);
  const rooftopKw =
    Number(property.rooftopCapacityKw) > 0 ? Number(property.rooftopCapacityKw) : null;
  const groundKw = Number(property.groundCapacityKw) > 0 ? Number(property.groundCapacityKw) : null;
  facts.re_installed_capacity_rooftop_kw = str(rooftopKw);
  facts.re_installed_capacity_ground_kw = str(groundKw);
  facts.re_installed_capacity_rooftop_ground_kw =
    rooftopKw != null && groundKw != null
      ? str(Math.round((rooftopKw + groundKw) * 100) / 100)
      : '';
  facts.capacity_type = [rooftopKw != null ? 'Rooftop' : '', groundKw != null ? 'Ground mount' : '']
    .filter(Boolean)
    .join(' + ');
  facts.re_arrangement_type = property.reArrangementType
    ? (RE_ARRANGEMENT_TYPE_LABELS[property.reArrangementType] ?? '')
    : '';

  // Form-only facts: no report prints them, so no fingerprint reads them. The
  // DISCOM label needs `property.discom`, which the workspace loads and the
  // list batch does not; the batch only computes statuses, so it never needs it.
  facts.site_discom = property.discom ? buildDiscomLabel(property.discom) : '';
  facts.site_connection_type = property.connectionType
    ? (CONNECTION_TYPE_LABELS[property.connectionType] ?? '')
    : '';

  facts.installed_capacity_kw = str(kw);
  facts.installed_capacity_wp = kw != null ? str(Math.round(kw * 1000)) : '';

  // A mixed panel set is joined, never truncated to its first entry: this is
  // filed with the utility, and the first entry understated module count and
  // capacity for every quote with more than one panel line.
  if (panels.length > 0) {
    facts.module_make = Array.from(
      new Set(panels.map((panel) => str(panel.brand)).filter(Boolean)),
    ).join(', ');
    facts.module_model_number = Array.from(
      new Set(panels.map((panel) => str(panel.name)).filter(Boolean)),
    ).join(', ');
    facts.module_wattage = Array.from(
      new Set(panels.map((panel) => str(panel.wattagePerPanel)).filter(Boolean)),
    ).join(', ');
    facts.module_count = str(panels.reduce((sum, panel) => sum + (panel.quantity ?? 0), 0));
    const totalWp = panels.reduce(
      (sum, panel) => sum + (panel.wattagePerPanel ?? 0) * (panel.quantity ?? 0),
      0,
    );
    facts.module_total_kw = totalWp > 0 ? str(totalWp / 1000) : '';
    facts.module_warranty = Array.from(
      new Set(
        panels
          .map((panel) => {
            const product = panel.productWarrantyYears;
            const performance = panel.performanceWarrantyYears;
            return product || performance
              ? `${product ?? ''}${product && performance ? '+' : ''}${performance ?? ''} Years`.trim()
              : '';
          })
          .filter(Boolean),
      ),
    ).join(', ');
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

/**
 * What an editable field's input starts from, where that differs from the
 * printed value: the stored property type, DISCOM id, connection type and RE
 * arrangement type
 * (the printed values are their labels).
 * Everything else starts from the printed value — the consumer name falls
 * back to the customer's name, and saving it writes the site's consumer name.
 */
export function resolveEditValues(
  project: ProjectEntity,
  facts: Record<FactKey, string>,
): Record<FactKey, string> {
  const property = project.property;
  return {
    ...facts,
    site_category: str(property.propertyType),
    site_discom: str(property.discomId),
    site_connection_type: str(property.connectionType),
    re_arrangement_type: str(property.reArrangementType),
  };
}

/** Facts shown from a fallback because their own field is empty: a site without a consumer name shows the customer's name. */
export function resolveFallbackKeys(project: ProjectEntity): Set<FactKey> {
  return new Set<FactKey>(project.property.consumerName?.trim() ? [] : ['consumer_name']);
}
