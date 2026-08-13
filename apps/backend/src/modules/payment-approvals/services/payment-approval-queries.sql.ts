/**
 * Reads for the approval queue.
 *
 * The queue is worked by someone who did not record the payment, so a row has to
 * say *which customer and which project* on its face — an amount and a UTR alone
 * cannot be checked against a bank statement. The entity carries only
 * `project_id` / `customer_id` UUIDs, hence these joins.
 *
 * `customer_id` on the pending row is usually null (the record endpoints do not
 * require it), so the customer is resolved through the project's property using
 * the same path as the finance queries: projects → customer_properties →
 * customer_profiles.
 */

/** Columns shared by the list and the single-row read. */
const SELECT_COLUMNS = `
    p.id,
    p.request_no                                                                  AS "requestNo",
    p.kind,
    p.status,
    p.project_id                                                                  AS "projectId",
    pr.project_number                                                             AS "projectNumber",
    pr.name                                                                       AS "projectName",
    prop.customer_id                                                              AS "customerId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')                 AS "customerName",
    cp.phone                                                                      AS "customerPhone",
    p.entry_type                                                                  AS "entryType",
    p.direction,
    p.amount_paise                                                                AS "amountPaise",
    p.value_date                                                                  AS "valueDate",
    p.payment_method                                                              AS "paymentMethod",
    p.counterparty,
    p.category,
    p.reference,
    p.notes,
    p.allocations,
    p.reverses_entry_id                                                           AS "reversesEntryId",
    p.reversal_reason                                                             AS "reversalReason",
    p.proof_document_id                                                           AS "proofDocumentId",
    doc.file_url                                                                  AS "proofUrl",
    doc.file_name                                                                 AS "proofFileName",
    doc.mime_type                                                                 AS "proofMimeType",
    p.submitted_by                                                                AS "submittedBy",
    NULLIF(TRIM(CONCAT_WS(' ', su.first_name, su.last_name)), '')                 AS "submittedByName",
    p.submitted_at                                                                AS "submittedAt",
    p.reviewed_by                                                                 AS "reviewedBy",
    NULLIF(TRIM(CONCAT_WS(' ', ru.first_name, ru.last_name)), '')                 AS "reviewedByName",
    p.reviewed_at                                                                 AS "reviewedAt",
    p.rejection_reason                                                            AS "rejectionReason",
    p.ledger_entry_id                                                             AS "ledgerEntryId"
`;

const JOINS = `
  FROM pending_ledger_entries p
  JOIN projects pr                    ON pr.id = p.project_id
  LEFT JOIN customer_properties prop  ON prop.id = pr.property_id
  LEFT JOIN customer_profiles cp      ON cp.id = prop.customer_id
  LEFT JOIN documents doc             ON doc.id = p.proof_document_id
  LEFT JOIN users su                  ON su.id = p.submitted_by
  LEFT JOIN users ru                  ON ru.id = p.reviewed_by
`;

/**
 * Filters are all optional and applied with the `$n IS NULL OR` idiom so one
 * prepared statement serves every combination.
 *
 * Ordered oldest-first: the queue should drain in the order it filled.
 */
export const APPROVALS_PAGE_SQL = `
  SELECT ${SELECT_COLUMNS}
  ${JOINS}
  WHERE ($1::text IS NULL OR p.status = $1)
    AND ($2::text IS NULL OR p.kind = $2)
    AND ($3::uuid IS NULL OR p.project_id = $3)
    AND ($4::uuid IS NULL OR prop.customer_id = $4)
    AND ($5::date IS NULL OR p.value_date >= $5)
    AND ($6::date IS NULL OR p.value_date <= $6)
    AND (
      $7::text IS NULL
      OR p.request_no   ILIKE '%' || $7 || '%'
      OR p.reference    ILIKE '%' || $7 || '%'
      OR p.counterparty ILIKE '%' || $7 || '%'
      OR pr.project_number ILIKE '%' || $7 || '%'
      OR pr.name        ILIKE '%' || $7 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $7 || '%'
    )
  ORDER BY p.submitted_at ASC
  LIMIT $8 OFFSET $9
`;

export const APPROVALS_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  ${JOINS}
  WHERE ($1::text IS NULL OR p.status = $1)
    AND ($2::text IS NULL OR p.kind = $2)
    AND ($3::uuid IS NULL OR p.project_id = $3)
    AND ($4::uuid IS NULL OR prop.customer_id = $4)
    AND ($5::date IS NULL OR p.value_date >= $5)
    AND ($6::date IS NULL OR p.value_date <= $6)
    AND (
      $7::text IS NULL
      OR p.request_no   ILIKE '%' || $7 || '%'
      OR p.reference    ILIKE '%' || $7 || '%'
      OR p.counterparty ILIKE '%' || $7 || '%'
      OR pr.project_number ILIKE '%' || $7 || '%'
      OR pr.name        ILIKE '%' || $7 || '%'
      OR TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)) ILIKE '%' || $7 || '%'
    )
`;

export const APPROVAL_BY_ID_SQL = `
  SELECT ${SELECT_COLUMNS}
  ${JOINS}
  WHERE p.id = $1
`;
