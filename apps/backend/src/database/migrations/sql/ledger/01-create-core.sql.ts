/**
 * Ledger core DDL.
 *
 * These statements are exported as constants rather than inlined into the
 * migration so the dry-run rehearsal (`scripts/ledger-dry-run.ts`) executes the
 * *identical* SQL. If the rehearsal ran a paraphrase, it would prove nothing.
 *
 * Deliberate deviations from house convention, each load-bearing:
 *
 *  - Money is `BIGINT` signed paise, not `NUMERIC(15,2)`. node-postgres returns
 *    `numeric` as a string, which is why `payment.service.ts:99-102` compares
 *    money lexicographically today. Integers remove the failure mode.
 *  - The ledger tables have no `updated_at`, no `deleted_at` and no `version`.
 *    Every one of those columns exists to be UPDATEd, and the append-only
 *    trigger (migration M7) rejects UPDATE outright.
 *  - `payment_milestones` has no `deleted_at` either: "cancel" is a hard DELETE,
 *    guarded by ON DELETE RESTRICT from `ledger_allocations`. A milestone with
 *    money attached cannot be deleted; one without can. That is strictly safer
 *    than soft-delete, which lets you orphan money by forgetting a predicate.
 */

/**
 * The contract. Replaces `project_payment_terms`.
 *
 * No `paid_amount`: pending/partial/paid are derived in `v_milestone_balance`.
 * Storing that figure is exactly the bug this rebuild removes — a cache with
 * two writers that the whole dashboard read from.
 *
 * `created_by` is NULLable because 39 of 84 live `project_payment_terms` rows
 * have a NULL `created_by` and there is no system user account to point a
 * sentinel at. Inventing a UUID would violate an FK to `users` if one is ever
 * added. (`ledger_entries.created_by` IS NOT NULL — verified zero NULLs there.)
 */
export const CREATE_PAYMENT_MILESTONES = `
  CREATE TABLE IF NOT EXISTS payment_milestones (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL,
    project_id              UUID NOT NULL,

    source                  VARCHAR(30) NOT NULL DEFAULT 'manual',
    source_quote_version_id UUID,

    stage                   VARCHAR(100) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    display_order           INTEGER NOT NULL,

    amount_paise            BIGINT NOT NULL,
    percentage              NUMERIC(9, 6),
    payer_type              VARCHAR(20) NOT NULL DEFAULT 'customer',

    due_date                DATE,
    due_date_source         VARCHAR(20) NOT NULL DEFAULT 'unset',
    due_basis_stage         VARCHAR(100),
    due_offset_days         INTEGER,

    status                  VARCHAR(10) NOT NULL DEFAULT 'active',
    waived_reason           VARCHAR(500),
    waived_at               TIMESTAMPTZ,
    waived_by               UUID,

    notes                   TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT fk_payment_milestones_project
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_milestones_quote_version
      FOREIGN KEY (source_quote_version_id) REFERENCES quote_versions(id) ON DELETE SET NULL,

    CONSTRAINT chk_payment_milestones_amount_positive CHECK (amount_paise > 0),
    CONSTRAINT chk_payment_milestones_source
      CHECK (source IN ('quote_snapshot', 'manual', 'change_order')),
    CONSTRAINT chk_payment_milestones_status
      CHECK (status IN ('active', 'waived')),
    CONSTRAINT chk_payment_milestones_payer_type
      CHECK (payer_type IN ('customer', 'lender')),
    CONSTRAINT chk_payment_milestones_due_source
      CHECK (due_date_source IN ('unset', 'manual', 'stage_event', 'offset')),
    CONSTRAINT chk_payment_milestones_waive_fields
      CHECK ((status = 'waived') = (waived_at IS NOT NULL)),
    CONSTRAINT chk_payment_milestones_percentage_range
      CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100)),

    -- target for the composite FK that makes cross-project allocation impossible
    CONSTRAINT uq_payment_milestones_id_project UNIQUE (id, project_id)
  )
`;

/**
 * DEFERRABLE so a reorder transaction can swap display_order values without
 * tripping the constraint mid-statement.
 */
export const CREATE_PAYMENT_MILESTONES_ORDER_UNIQUE = `
  ALTER TABLE payment_milestones
    ADD CONSTRAINT uq_payment_milestones_project_order
    UNIQUE (project_id, display_order) DEFERRABLE INITIALLY IMMEDIATE
`;

export const CREATE_PAYMENT_MILESTONES_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_payment_milestones_project_order
     ON payment_milestones (project_id, display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_milestones_due_active
     ON payment_milestones (due_date) WHERE status = 'active'`,
  `CREATE INDEX IF NOT EXISTS idx_payment_milestones_org
     ON payment_milestones (organization_id)`,
];

export const CREATE_PAYMENT_MILESTONES_UPDATED_AT_TRIGGER = `
  CREATE TRIGGER trg_payment_milestones_updated_at
    BEFORE UPDATE ON payment_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
`;

/**
 * The single source of truth for money. Append-only; enforced by trigger in M7.
 *
 * `amount_paise` is SIGNED. A bounced ₹50,000 cheque is a second row of
 * -5000000 with the same `direction` and `reverses_id` set — so
 * `SUM(amount_paise)` is automatically net of reversals everywhere, with no
 * status machine and no special-casing.
 */
export const CREATE_LEDGER_ENTRIES = `
  CREATE TABLE IF NOT EXISTS ledger_entries (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL,
    project_id             UUID NOT NULL,
    customer_id            UUID,

    entry_no               VARCHAR(60) NOT NULL,
    entry_type             VARCHAR(30) NOT NULL,
    direction              VARCHAR(3)  NOT NULL,
    amount_paise           BIGINT      NOT NULL,

    value_date             DATE        NOT NULL,
    value_date_is_inferred BOOLEAN     NOT NULL DEFAULT false,

    payment_method         VARCHAR(50),
    counterparty           VARCHAR(255),
    category               VARCHAR(30),
    reference              VARCHAR(255),
    notes                  TEXT,

    source_table           VARCHAR(63),
    source_id              UUID,

    reverses_id            UUID,
    reversal_reason        VARCHAR(500),

    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by             UUID NOT NULL,

    CONSTRAINT fk_ledger_entries_project
      FOREIGN KEY (project_id)  REFERENCES projects(id)          ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_entries_customer
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_entries_reverses
      FOREIGN KEY (reverses_id) REFERENCES ledger_entries(id)    ON DELETE RESTRICT,

    CONSTRAINT chk_ledger_entries_amount_nonzero CHECK (amount_paise <> 0),
    CONSTRAINT chk_ledger_entries_direction      CHECK (direction IN ('in', 'out')),
    CONSTRAINT chk_ledger_entries_type
      CHECK (entry_type IN ('receipt', 'expense', 'refund', 'write_off')),
    CONSTRAINT chk_ledger_entries_source_table
      CHECK (source_table IS NULL OR source_table IN ('payments', 'project_expenses', 'manual')),

    -- A normal entry's sign matches its direction; a reversal's sign is inverted.
    -- Written as one equivalence so the two cases cannot drift apart.
    CONSTRAINT chk_ledger_entries_direction_sign
      CHECK ((reverses_id IS NULL) = ((direction = 'in') = (amount_paise > 0))),

    CONSTRAINT chk_ledger_entries_type_direction
      CHECK ((entry_type = 'receipt' AND direction = 'in')
          OR (entry_type IN ('expense', 'refund', 'write_off') AND direction = 'out')),

    CONSTRAINT chk_ledger_entries_reversal_reason
      CHECK (reverses_id IS NULL OR reversal_reason IS NOT NULL),

    CONSTRAINT uq_ledger_entries_id_project UNIQUE (id, project_id)
  )
`;

export const CREATE_LEDGER_ENTRIES_INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_entry_no
     ON ledger_entries (organization_id, entry_no)`,
  // an entry may be reversed at most once
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_reverses
     ON ledger_entries (reverses_id) WHERE reverses_id IS NOT NULL`,
  // idempotency: a source row posts exactly once (its reversal is excluded)
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_source
     ON ledger_entries (source_table, source_id)
     WHERE source_id IS NOT NULL AND reverses_id IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_entries_project_value_date
     ON ledger_entries (project_id, value_date DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_entries_org_direction_value_date
     ON ledger_entries (organization_id, direction, value_date)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer
     ON ledger_entries (customer_id) WHERE customer_id IS NOT NULL`,
];

/**
 * Which milestone a payment pays — kept SEPARATE from the cash row.
 *
 * This separation is what makes the 114 misallocated production projects
 * fixable after migration, and what lets one receipt split across milestones.
 * Welding `milestone_id` onto an immutable ledger row would freeze
 * ₹1,04,24,814 of error permanently.
 *
 * `project_id` is denormalised for one reason only: to carry the composite FKs
 * below, which make a cross-project allocation impossible at the database level
 * rather than by code review.
 */
export const CREATE_LEDGER_ALLOCATIONS = `
  CREATE TABLE IF NOT EXISTS ledger_allocations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id     UUID   NOT NULL,
    milestone_id UUID   NOT NULL,
    project_id   UUID   NOT NULL,
    amount_paise BIGINT NOT NULL,
    is_inferred  BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   UUID NOT NULL,

    CONSTRAINT fk_ledger_allocations_entry
      FOREIGN KEY (entry_id, project_id)
      REFERENCES ledger_entries (id, project_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_allocations_milestone
      FOREIGN KEY (milestone_id, project_id)
      REFERENCES payment_milestones (id, project_id) ON DELETE RESTRICT,

    CONSTRAINT chk_ledger_allocations_amount_nonzero CHECK (amount_paise <> 0)
  )
`;

export const CREATE_LEDGER_ALLOCATIONS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_ledger_allocations_milestone
     ON ledger_allocations (milestone_id) INCLUDE (amount_paise)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_allocations_entry
     ON ledger_allocations (entry_id) INCLUDE (amount_paise)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_allocations_project
     ON ledger_allocations (project_id)`,
];

/**
 * Allocations of an entry may never exceed the entry itself — that would be
 * creating money out of nothing.
 *
 * NOT a CHECK: the invariant spans rows. DEFERRED so a multi-row allocation
 * insert inside one transaction is evaluated once at commit. The
 * `SELECT ... FOR UPDATE` on the parent entry is the actual concurrency
 * mechanism; without it the invariant is advisory under READ COMMITTED.
 *
 * Note what is deliberately NOT constrained: over-allocating a MILESTONE.
 * That is legitimate (genuine overpayment) and 114 migrated projects carry it,
 * so it is surfaced as `over_allocated_paise` data rather than blocked.
 */
export const CREATE_ALLOCATION_GUARD_FUNCTION = `
  CREATE OR REPLACE FUNCTION ledger_assert_entry_not_over_allocated()
  RETURNS trigger AS $$
  DECLARE
    entry_amount BIGINT;
    alloc_sum    BIGINT;
  BEGIN
    SELECT amount_paise INTO entry_amount
      FROM ledger_entries WHERE id = NEW.entry_id FOR UPDATE;

    SELECT COALESCE(SUM(amount_paise), 0)::BIGINT INTO alloc_sum
      FROM ledger_allocations WHERE entry_id = NEW.entry_id;

    IF SIGN(alloc_sum) <> 0 AND SIGN(alloc_sum) <> SIGN(entry_amount) THEN
      RAISE EXCEPTION
        'ledger_allocations: allocation sign (%) contradicts entry % sign (%)',
        alloc_sum, NEW.entry_id, entry_amount
        USING ERRCODE = '23514';
    END IF;

    IF ABS(alloc_sum) > ABS(entry_amount) THEN
      RAISE EXCEPTION
        'ledger_allocations: entry % over-allocated (allocations=%, entry=%)',
        NEW.entry_id, alloc_sum, entry_amount
        USING ERRCODE = '23514';
    END IF;

    RETURN NULL;
  END;
  $$ LANGUAGE plpgsql
`;

export const CREATE_ALLOCATION_GUARD_TRIGGER = `
  CREATE CONSTRAINT TRIGGER trg_ledger_allocations_not_over_allocated
    AFTER INSERT ON ledger_allocations
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION ledger_assert_entry_not_over_allocated()
`;

/** Every statement above, in dependency order. */
export const CREATE_LEDGER_CORE: string[] = [
  CREATE_PAYMENT_MILESTONES,
  CREATE_PAYMENT_MILESTONES_ORDER_UNIQUE,
  ...CREATE_PAYMENT_MILESTONES_INDEXES,
  CREATE_PAYMENT_MILESTONES_UPDATED_AT_TRIGGER,
  CREATE_LEDGER_ENTRIES,
  ...CREATE_LEDGER_ENTRIES_INDEXES,
  CREATE_LEDGER_ALLOCATIONS,
  ...CREATE_LEDGER_ALLOCATIONS_INDEXES,
  CREATE_ALLOCATION_GUARD_FUNCTION,
  CREATE_ALLOCATION_GUARD_TRIGGER,
];

/** Reverse order, for down(). */
export const DROP_LEDGER_CORE: string[] = [
  `DROP TRIGGER IF EXISTS trg_ledger_allocations_not_over_allocated ON ledger_allocations`,
  `DROP FUNCTION IF EXISTS ledger_assert_entry_not_over_allocated()`,
  `DROP TABLE IF EXISTS ledger_allocations`,
  `DROP TABLE IF EXISTS ledger_entries`,
  `DROP TRIGGER IF EXISTS trg_payment_milestones_updated_at ON payment_milestones`,
  `DROP TABLE IF EXISTS payment_milestones`,
];
