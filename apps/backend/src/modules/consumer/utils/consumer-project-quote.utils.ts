import type { ProjectEntity } from '../../projects/entities/project.entity';
import type { QuoteVersionEntity } from '../../quotes/entities/quote-version.entity';

export interface ConsumerQuoteFinancialFields {
  contractValue: number;
  subsidyAmount: number;
  netCost: number;
}

/**
 * Contract value and subsidy for the customer-facing views.
 *
 * Previously this sorted `project.quote.versions` and took the LATEST one. That
 * meant revising a quote after the project existed silently re-priced a signed
 * deal — and 12 of 219 production projects have a milestone schedule that no
 * longer matches the price their customer is being shown.
 *
 * Now it reads the version pinned at conversion (`projects.contract_quote_version_id`,
 * added in migration 1851000000001), falling back to the earliest version — the
 * state at conversion time — rather than the newest.
 *
 * Note this returns the GROSS contract. Subsidy is NOT company money: the
 * government pays the customer directly, so the customer owes the full amount
 * and the subsidy is shown for information only. It must never be deducted from
 * what is billed, and never enters the ledger.
 */
export function resolveQuoteFinancialFields(project: ProjectEntity): ConsumerQuoteFinancialFields {
  const versions = project.quote?.versions ?? [];
  const version = pickContractVersion(project, versions);

  const contractValue = Number(version?.finalPrice ?? 0);
  const subsidyAmount = Number(version?.quoteSnapshot?.pricing?.subsidyAmount ?? 0);

  // Display-only: "you are eligible for ₹X back from the government".
  const netCost = Math.max(0, contractValue - subsidyAmount);

  return { contractValue, subsidyAmount, netCost };
}

function pickContractVersion(
  project: ProjectEntity,
  versions: QuoteVersionEntity[],
): QuoteVersionEntity | null {
  if (versions.length === 0) {
    return null;
  }

  const pinned = project.contractQuoteVersionId
    ? versions.find((v) => v.id === project.contractQuoteVersionId)
    : undefined;
  if (pinned) {
    return pinned;
  }

  // Fallback: the state at conversion, i.e. the EARLIEST version — deliberately
  // not the latest, which is the behaviour being fixed.
  return [...versions].sort((a, b) => {
    const created = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return created !== 0 ? created : a.versionNumber - b.versionNumber;
  })[0] as QuoteVersionEntity;
}
