import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { FollowupStatus, FollowupType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';
import { SiteWorkItemDto } from '../dto/site-work-item.dto';

interface SiteWorkRow {
  followupId: string;
  kind: 'visit' | 'survey';
  scheduledAt: Date;
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
 */
@Injectable()
export class SiteWorkService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findMine(userId: string): Promise<SiteWorkItemDto[]> {
    const rows: SiteWorkRow[] = await this.dataSource.query(
      `SELECT f.id                AS "followupId",
              f.type              AS "kind",
              f.scheduled_at      AS "scheduledAt",
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
              p.gps_coordinates   AS "gpsCoordinates"
         FROM followups f
         JOIN customer_properties p ON p.id = f.property_id AND p.deleted_at IS NULL
         JOIN customer_profiles   c ON c.id = f.customer_id AND c.deleted_at IS NULL
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
        WHERE f.deleted_at IS NULL
          AND f.assigned_to_user_id = $1::uuid
          AND f.status = $2
          AND f.type = ANY($3::text[])
     ORDER BY f.scheduled_at ASC
        LIMIT 200`,
      [userId, FollowupStatus.PENDING, [FollowupType.VISIT, FollowupType.SURVEY]],
    );

    return rows.map((row) => ({
      followupId: row.followupId,
      kind: row.kind,
      scheduledAt: row.scheduledAt,
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
      gpsCoordinates: row.gpsCoordinates ?? undefined,
    }));
  }
}
