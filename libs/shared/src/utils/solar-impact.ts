import { SOLAR_IMPACT_CONSTANTS } from '../constants/solar';

export interface SolarImpactInput {
  systemSizeKw: number;
  estimatedCost?: number;
}

export interface SolarImpactResult {
  annualKwh: number;
  monthlyKwh: number;
  annualSavings: number;
  monthlySavings: number;
  co2TonnesPerYear: number;
  treesEquivalent: number;
  paybackYears?: number;
  npv25YearRupees: number;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeSolarImpact(input: SolarImpactInput): SolarImpactResult {
  const safeSystemSizeKw = Number.isFinite(input.systemSizeKw)
    ? Math.max(0, input.systemSizeKw)
    : 0;
  const annualKwh = round(safeSystemSizeKw * SOLAR_IMPACT_CONSTANTS.kwhPerKwPerYear, 0);
  const monthlyKwh = round(annualKwh / 12);

  const annualSavings = round(annualKwh * SOLAR_IMPACT_CONSTANTS.rupeesPerKwh);
  const monthlySavings = round(annualSavings / 12);

  const annualCo2Kg = annualKwh * SOLAR_IMPACT_CONSTANTS.co2KgPerKwh;
  const co2TonnesPerYear = round(annualCo2Kg / 1000);
  const treesEquivalent = round(annualCo2Kg / SOLAR_IMPACT_CONSTANTS.co2KgPerTreePerYear, 0);

  const npv25YearRupees = round(annualSavings * SOLAR_IMPACT_CONSTANTS.npvYears);

  const safeEstimatedCost =
    input.estimatedCost != null && Number.isFinite(input.estimatedCost)
      ? Math.max(0, input.estimatedCost)
      : undefined;
  const paybackYears =
    safeEstimatedCost != null && annualSavings > 0
      ? round(safeEstimatedCost / annualSavings, 1)
      : undefined;

  return {
    annualKwh,
    monthlyKwh,
    annualSavings,
    monthlySavings,
    co2TonnesPerYear,
    treesEquivalent,
    paybackYears,
    npv25YearRupees,
  };
}
