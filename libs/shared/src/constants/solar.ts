export const SOLAR_IMPACT_CONSTANTS = {
  // Approximate India average generation: 4 kWh per kW per day.
  kwhPerKwPerYear: 1460,
  // Blended commercial/residential tariff for high-level savings estimate.
  rupeesPerKwh: 8,
  // Grid emission factor (kg CO2 per kWh).
  co2KgPerKwh: 0.82,
  // Typical annual carbon absorption per mature tree (kg CO2 / year).
  co2KgPerTreePerYear: 22,
  npvYears: 25,
} as const;
