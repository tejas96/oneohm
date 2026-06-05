import type { ProjectEntity } from '../../projects/entities/project.entity';

export interface ConsumerQuoteFinancialFields {
  contractValue: number;
  subsidyAmount: number;
  netCost: number;
}

/**
 * Derives contract value and subsidy from the project's latest quote version.
 */
export function resolveQuoteFinancialFields(project: ProjectEntity): ConsumerQuoteFinancialFields {
  const versions = project.quote?.versions ?? [];
  const latestVersion =
    versions.length > 0
      ? [...versions].sort((a, b) => {
          const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (createdDiff !== 0) {
            return createdDiff;
          }
          return b.versionNumber - a.versionNumber;
        })[0]
      : null;

  const contractValue = Number(latestVersion?.finalPrice ?? 0);
  const pricing = (latestVersion as any)?.pricingBreakdown as
    | { subsidyAmount?: number }
    | undefined;
  const snapshotPricing = (
    latestVersion?.quoteSnapshot as { pricing?: { subsidyAmount?: number } } | undefined
  )?.pricing;
  const subsidyAmount = Number(pricing?.subsidyAmount ?? snapshotPricing?.subsidyAmount ?? 0);
  const netCost = Math.max(0, contractValue - subsidyAmount);

  return { contractValue, subsidyAmount, netCost };
}
