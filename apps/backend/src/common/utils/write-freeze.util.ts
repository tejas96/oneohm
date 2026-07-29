import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Cutover write freeze, shared by the ledger and the legacy money paths.
 *
 * During the migration window every money write must stop. A receipt recorded
 * after the backfill snapshot but before the switch lands in the OLD tables,
 * never reaches `ledger_entries`, and is invisible to every reconciliation gate
 * — the rollback boundary crossed silently.
 *
 * `MAINTENANCE_MODE` cannot do this job: it is only surfaced to the two mobile
 * apps via `/app-config/version-check` and blocks no web API write at all.
 *
 * The legacy `payments` / `payment-terms` / `project-expenses` modules stay
 * mounted until the frontend stops calling them, so guarding only the new
 * ledger path would leave the live UI writing freely through the old one.
 *
 * Set `LEDGER_WRITES_FROZEN=true` for the window; unset it once the gates pass.
 * Reads stay available throughout.
 */
export function assertMoneyWritesAllowed(): void {
  if (process.env.LEDGER_WRITES_FROZEN === 'true') {
    throw new ServiceUnavailableException(
      'Finance is temporarily read-only while the ledger migration completes. ' +
        'Please retry shortly — nothing you have already recorded is affected.',
    );
  }
}
