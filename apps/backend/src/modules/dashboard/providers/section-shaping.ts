import type { DashboardBucket, DashboardItem } from '@tejas96/shared/types';

import type { OkSection } from './provider.types';

/** The row shape every provider's SQL must return. */
export interface ProviderRow {
  kind: string;
  severity: 'critical' | 'warning' | 'info';
  bucket: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  reason: string;
  meta: string | null;
  meta_secondary?: string | null;
  due_date: string | null;
  action: string;
  customer_id: string | null;
  property_id: string | null;
  project_id?: string | null;
  /** From COUNT(*) OVER (PARTITION BY bucket). Postgres returns bigint as string. */
  bucket_total: string;
  /** From ROW_NUMBER() OVER (PARTITION BY bucket ...). */
  rn: string;
}

/**
 * The permission each action needs, mirrored from the frontend catalog
 * (`apps/web/lib/rbac/catalog.ts`). The backend only REPORTS this — it does not
 * enforce it, because backend RBAC does not exist in this app. The web mutes
 * the control and opens the access dialog.
 */
export const GATE_FOR_ACTION: Record<string, string | null> = {
  add_property: 'properties.create',
  open_property: 'properties.view',
  complete_survey: 'properties.edit',
  create_quote: 'quotes.create',
  open_quote: 'quotes.view',
  convert_to_project: 'projects.create',
  complete_followup: 'followups.manage',
  open_service: 'service.view',
  open_project: 'projects.view',
  open_payments: 'finance.view',
};

/**
 * Turn window-function rows into a section.
 *
 * `count` comes from `bucket_total` — the total across the WHOLE scoped set —
 * while `items` is capped. That is the point: the badge always describes the
 * full set even when the card shows five of it.
 */
export function toSection(
  rows: ProviderRow[],
  cap: number,
  labels: Record<string, string>,
): OkSection {
  const byBucket = new Map<string, DashboardBucket>();

  for (const row of rows) {
    let bucket = byBucket.get(row.bucket);
    if (!bucket) {
      bucket = {
        key: row.bucket,
        label: labels[row.bucket] ?? row.bucket,
        count: Number(row.bucket_total),
        items: [],
      };
      byBucket.set(row.bucket, bucket);
    }
    if (Number(row.rn) > cap) continue;

    const params: Record<string, string> = { id: row.entity_id };
    if (row.customer_id) params.customerId = row.customer_id;
    if (row.property_id) params.propertyId = row.property_id;
    if (row.project_id) params.projectId = row.project_id;

    bucket.items.push({
      id: `${row.kind}:${row.entity_id}`,
      kind: row.kind as DashboardItem['kind'],
      severity: row.severity,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      reason: row.reason,
      meta: row.meta ?? undefined,
      metaSecondary: row.meta_secondary ?? undefined,
      dueDate: row.due_date ?? undefined,
      action: row.action as DashboardItem['action'],
      params,
      gate: GATE_FOR_ACTION[row.action] ?? null,
    });
  }

  const buckets = [...byBucket.values()];
  return {
    status: 'ok',
    total: buckets.reduce((sum, b) => sum + b.count, 0),
    criticalCount: rows.filter((r) => r.severity === 'critical').length,
    buckets,
  };
}
