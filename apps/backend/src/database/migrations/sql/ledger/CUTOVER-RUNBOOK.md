# Ledger cutover runbook

## Why the obvious sequence does not work

`apps/backend/fly.toml` currently has:

```toml
[deploy]
  strategy = 'rolling'

[processes]
  app = 'sh -c "node src/scripts/run-migrations.js && exec node src/main.js"'
```

Migrations run **unattended inside every new machine at boot**, and under a rolling
deploy the new machine starts serving while old machines are still up. So:

- `ledger-dry-run.ts --verify-only` cannot gate anything — the migration has already
  run and traffic is already flowing by the time anyone could look at the output.
- Any receipt an **old** machine records after the backfill has run lands in
  `payments` and never reaches `ledger_entries`. That receipt is invisible, and the
  reconciliation will not find it because it did not exist when the snapshot was taken.

That second point is the rollback boundary being crossed automatically, before a
human can make a decision.

There is also a `grace_period = '60s'` health check (`fly.toml:92`). If M1–M7 takes
longer than that on production volumes, the machine is killed **mid-transaction** and
crash-loops. Measure the wall time during the staging rehearsal.

---

## Cutover sequence

### 1. Rehearse on a production snapshot

```bash
# restore a prod dump into staging, then:
cd apps/backend
DATABASE_LOGGING=false npx ts-node -r tsconfig-paths/register \
  src/scripts/ledger-dry-run.ts --csv /tmp/finance-review.csv
```

All gates must be green. Send `/tmp/finance-review.csv` to the finance lead and get
**written sign-off** — it lists every milestone whose attribution changes. Note the
migration wall time here and compare it against `grace_period`.

### 2. Prepare the deploy (this release only)

Edit `apps/backend/fly.toml`:

```toml
[deploy]
  strategy = 'immediate'      # was 'rolling' — old and new must not serve concurrently

[processes]
  app = 'node src/main.js'    # migrations become an operator-run one-off, not a boot step
```

Raise `grace_period` if step 1 showed the migration running close to 60s.

**Restore both to their current values in the next release.**

### 3. Freeze writes

```bash
fly secrets set LEDGER_WRITES_FROZEN=true --app <backend-app>
```

Every ledger write then returns 503 with a message telling the user to retry shortly.
Reads stay up, so the app still renders.

> `MAINTENANCE_MODE` does **not** cover this. It is only surfaced to the two mobile
> apps through `/app-config/version-check` and blocks no web API write.

Separately, force-upgrade or maintenance-mode the mobile apps via the same
`/app-config` mechanism if you want them fully quiet during the window.

### 4. Back up

```bash
fly pg dump --app oneohm-epc-db > pre-ledger-$(date +%Y%m%d-%H%M).sql
```

Record the exact timestamp. This is the rollback artefact.

### 5. Migrate

```bash
fly ssh console --app <backend-app> -C "node src/scripts/run-migrations.js"
```

`run-migrations.ts` uses `transaction: 'all'`, so M1–M7 is a single transaction:
any failure leaves production exactly as it was.

### 6. Gate — the last exit

```bash
fly ssh console --app <backend-app> -C \
  "node src/scripts/ledger-dry-run.js --verify-only"
```

Exit code 0 means all gates passed. **Any red: restore the dump from step 4 and stop.**

> **Rollback boundary.** The old tables are untouched, so rollback is clean _only
> until the first new ledger entry is written_. After step 7 the freeze lifts and new
> receipts land in `ledger_entries` — rolling back the code from that point silently
> discards them. Name the go/no-go owner before you start.

### 7. Release

```bash
fly deploy --app <backend-app>            # backend
fly secrets unset LEDGER_WRITES_FROZEN --app <backend-app>
# then the web deploy
```

### 8. Verify against real traffic

- Consumer app: Home screen renders (not the full-screen error state), Payments tab
  shows correct statuses and amounts.
- Record one real receipt and confirm it allocates across milestones as expected.
- Re-run the gates once more.

---

## Afterwards

Restore `strategy = 'rolling'` and the boot-time migration command in the next
release, unless you decide the operator-run migration is worth keeping permanently.
It is — unattended schema changes at container boot under a rolling deploy is a
hazard that outlives this project — but that is a separate decision.

## Not yet done

The old tables and modules are still in place. `payments`,
`project_payment_terms` and `project_expenses` are retired only after the frontend
stops calling the legacy `/finance/*` endpoints, and after reconciliation has been
green through a full billing cycle.
