import { FollowupStatus, type FollowupType } from '@tejas96/shared/types';

/**
 * The next follow-up on a lead unit: the pending, not deleted follow-up with
 * the earliest `scheduled_at`. One definition, so a customer's row and the
 * site rows behind it name the same follow-up.
 *
 * Every type counts, site visits and surveys included — this answers "what does
 * this site owe next", the same question `nextFollowupAt` answers, not "what is
 * on my plate" (see SITE_WORK_TYPES in followup.repository.ts).
 *
 * A subquery for `LEFT JOIN LATERAL (…) nf ON true`. `scope` is the caller's
 * condition on `f` (the `followups` alias), e.g. `f.property_id = p.id`.
 * `pending_count` is how many follow-ups the scope has pending, on the one row
 * returned.
 */
export function nextPendingFollowupSql(scope: string): string {
  return `
        SELECT f.id,
               f.type,
               f.subject,
               f.scheduled_at,
               f.property_id,
               NULLIF(btrim(concat_ws(' ', usr.first_name, usr.last_name)), '') AS assignee_name,
               COUNT(*) OVER () AS pending_count
          FROM followups f
          LEFT JOIN users usr ON usr.id = f.assigned_to_user_id
         WHERE ${scope}
           AND f.deleted_at IS NULL
           AND f.status = '${FollowupStatus.PENDING}'
         ORDER BY f.scheduled_at ASC, f.created_at ASC, f.id ASC
         LIMIT 1
  `;
}

/** `SELECT` list for the columns of a `nextPendingFollowupSql` join aliased `nf`. */
export const NEXT_FOLLOWUP_COLUMNS = `
             nf.id            AS next_id,
             nf.type          AS next_type,
             nf.subject       AS next_subject,
             nf.scheduled_at  AS next_scheduled_at,
             nf.property_id   AS next_property_id,
             nf.assignee_name AS next_assignee_name,
             COALESCE(nf.pending_count, 0)::int AS pending_count
`;

/** The raw columns `NEXT_FOLLOWUP_COLUMNS` adds to a row. */
export interface NextFollowupColumns {
  next_id: string | null;
  next_type: FollowupType | null;
  next_subject: string | null;
  next_scheduled_at: Date | null;
  next_property_id: string | null;
  next_assignee_name: string | null;
  pending_count: number;
}

export interface NextFollowupRow {
  id: string;
  type: FollowupType;
  subject: string;
  scheduledAt: Date;
  /** Full name of the person it is assigned to; null when that user is gone. */
  assigneeName: string | null;
  /** Null for a follow-up on the customer itself. */
  propertyId: string | null;
}

export function toNextFollowup(row: NextFollowupColumns): NextFollowupRow | null {
  if (
    row.next_id === null ||
    row.next_type === null ||
    row.next_subject === null ||
    row.next_scheduled_at === null
  ) {
    return null;
  }
  return {
    id: row.next_id,
    type: row.next_type,
    subject: row.next_subject,
    scheduledAt: row.next_scheduled_at,
    assigneeName: row.next_assignee_name,
    propertyId: row.next_property_id,
  };
}
