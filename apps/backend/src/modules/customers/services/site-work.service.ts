import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { FollowupStatus, FollowupType, SiteStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';
import { SiteWorkItemDto } from '../dto/site-work-item.dto';

interface SiteWorkRow {
  followupId: string | null;
  kind: 'visit' | 'survey';
  scheduledAt: Date | null;
  propertyId: string;
  propertyName: string | null;
  address: string | null;
  city: string | null;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  systemSizeKw: string | null;
  siteVisitDone: boolean;
  surveyDone: boolean;
  completedAt: Date | null;
  gpsCoordinates: Record<string, unknown> | null;
}

/**
 * The field rep's queue: every site visit and survey booked against them.
 *
 * ONE query rather than the two a client would otherwise make. A row needs the
 * date from the followup and the site from the property, and neither half is
 * useful alone: "Thursday" with no address, or an address with no idea when.
 *
 * Ordered by scheduled_at ascending, which is exactly what the screen draws —
 * overdue, then today, then the rest. Nothing is re-sorted on the device. This
 * is the same guarantee followups.api.ts already documents and relies on.
 *
 * The LATERAL is the latest version of the latest quote, matching the ordering
 * QuoteRepository.findLatestByPropertyIds uses, so the size shown here and the
 * size shown everywhere else come from the same row rather than two
 * definitions of "latest" that drift.
 *
 * UNBOOKED JOBS TOO. Setting "Visit assignee" or "Survey assignee" on a
 * property writes the column and books no followup, so a queue of followups
 * alone missed them — My Day counted "17 visits" from the property and its
 * "View all" opened this list empty. Those rows come from the property with no
 * followup id and no date, on the same rules My Day counts by: a visit while
 * the site is pending, a survey until it is done or the site is cancelled. A
 * site that already has a pending followup of that kind is left to the
 * followup, whoever it is booked for, so a job never appears twice.
 */
@Injectable()
export class SiteWorkService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findMine(userId: string): Promise<SiteWorkItemDto[]> {
    const rows: SiteWorkRow[] = await this.dataSource.query(
      `WITH jobs AS (
              SELECT f.id AS followup_id, f.type AS kind, f.scheduled_at, f.property_id, f.customer_id
                FROM followups f
               WHERE f.deleted_at IS NULL
                 AND f.assigned_to_user_id = $1::uuid
                 AND f.status = $2
                 AND f.type = ANY($3::text[])
           UNION ALL
              SELECT NULL::uuid, $4::text, NULL::timestamptz, p.id, p.customer_id
                FROM customer_properties p
               WHERE p.deleted_at IS NULL
                 AND p.site_visit_assignee = $1::uuid
                 AND p.site_status = $6
                 AND NOT EXISTS (
                       SELECT 1 FROM followups f
                        WHERE f.property_id = p.id AND f.type = $4::text
                          AND f.status = $2 AND f.deleted_at IS NULL)
           UNION ALL
              SELECT NULL::uuid, $5::text, NULL::timestamptz, p.id, p.customer_id
                FROM customer_properties p
               WHERE p.deleted_at IS NULL
                 AND p.site_survey_assignee = $1::uuid
                 AND NOT COALESCE(p.survey_done, false)
                 AND p.site_status IS DISTINCT FROM $7
                 AND NOT EXISTS (
                       SELECT 1 FROM followups f
                        WHERE f.property_id = p.id AND f.type = $5::text
                          AND f.status = $2 AND f.deleted_at IS NULL)
      )
       SELECT j.followup_id       AS "followupId",
              j.kind              AS "kind",
              j.scheduled_at      AS "scheduledAt",
              p.id                AS "propertyId",
              p.property_name     AS "propertyName",
              p.address           AS "address",
              p.city              AS "city",
              c.id                AS "customerId",
              NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), '') AS "customerName",
              c.phone             AS "customerPhone",
              ${systemSizeKwSqlRaw('qv')} AS "systemSizeKw",
              p.site_visit_done   AS "siteVisitDone",
              p.survey_done       AS "surveyDone",
              CASE WHEN j.kind = 'visit' THEN p.site_visit_completed_at
                   ELSE p.site_survey_completed_at END AS "completedAt",
              p.gps_coordinates   AS "gpsCoordinates"
         FROM jobs j
         JOIN customer_properties p ON p.id = j.property_id AND p.deleted_at IS NULL
         JOIN customer_profiles   c ON c.id = j.customer_id AND c.deleted_at IS NULL
    LEFT JOIN LATERAL (
              SELECT v.total_wattage_wp
                FROM quotes q
                JOIN quote_versions v ON v.quote_id = q.id
               WHERE q.property_id = p.id
                 AND q.deleted_at IS NULL
            ORDER BY q.created_at DESC, q.id DESC,
                     v.created_at DESC, v.version_number DESC, v.id DESC
               LIMIT 1
         ) qv ON TRUE
     ORDER BY j.scheduled_at ASC NULLS LAST, p.property_name ASC
        LIMIT 200`,
      [
        userId,
        FollowupStatus.PENDING,
        [FollowupType.VISIT, FollowupType.SURVEY],
        FollowupType.VISIT,
        FollowupType.SURVEY,
        SiteStatus.PENDING,
        SiteStatus.CANCELLED,
      ],
    );

    return rows.map((row) => ({
      followupId: row.followupId ?? undefined,
      kind: row.kind,
      scheduledAt: row.scheduledAt ?? undefined,
      propertyId: row.propertyId,
      propertyName: row.propertyName ?? undefined,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      customerId: row.customerId,
      customerName: row.customerName ?? undefined,
      customerPhone: row.customerPhone ?? undefined,
      // Postgres NUMERIC arrives as a string.
      systemSizeKw: row.systemSizeKw === null ? undefined : Number(row.systemSizeKw),
      siteVisitDone: row.siteVisitDone,
      surveyDone: row.surveyDone,
      completedAt: row.completedAt ?? undefined,
      gpsCoordinates: row.gpsCoordinates ?? undefined,
    }));
  }
}
