export const SYSTEM_SIZE_CONFIG = {
  min: 1,
  max: 100,
  maxApi: 1000,
  step: 1,
  defaultResidential: 3,
  defaultCommercial: 10,
  defaultIndustrial: 50,
} as const;

export const FLOOR_CONFIG = {
  min: 0,
  max: 50,
  default: 0,
} as const;

export const DISTANCE_CONFIG = {
  min: 0,
  max: 500,
  default: 50,
  step: 5,
} as const;

export const DISCOUNT_PRESETS = [1000, 2000, 5000, 10000] as const;
