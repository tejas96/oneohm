'use client';

/**
 * FDAL hooks for the bulk endpoints introduced in Part 4 (PO bulk
 * approve / cancel, allocation bulk cancel, dispatch bulk cancel).
 *
 * Why this lives in its own file (instead of being added to the
 * existing per-resource hook files): every bulk endpoint returns the
 * same partial-success shape — `{ succeeded: string[]; failed: { id,
 * reason }[] }` — and the post-mutation invalidation surface is
 * uniform (invalidate the resource's list/detail buckets + any
 * `invalidateRelated` ones). Centralising here keeps the contract
 * tight and lets the consumer surface partial failures with the same
 * UI affordance everywhere.
 *
 * Toast policy: bulk operations don't auto-toast; the consumer
 * decides (e.g. "5 of 7 cancelled — see details" with a link to a
 * drawer listing the failures). Auto-toasting "1 of 7 succeeded" with
 * a generic message hides too much information.
 */
