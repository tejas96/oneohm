export const SYSTEM_PRODUCT_TYPE_CODES = [
  'solar_panel',
  'inverter',
  'mounting_structure',
] as const;

export type SystemProductTypeCode = (typeof SYSTEM_PRODUCT_TYPE_CODES)[number];

interface SystemAttributeDefinition {
  key: string;
  label: string;
  dataType: string;
  isRequired: boolean;
  isFilterable: boolean;
  group: string;
  sort: number;
  validation?: Record<string, unknown>;
}

interface SystemProductTypeDefinition {
  code: SystemProductTypeCode;
  name: string;
  defaultPricingBasis: string;
  defaultGstRate: number;
  defaultUnitOfMeasure: string;
  sortOrder: number;
  attributes: SystemAttributeDefinition[];
}

export const SYSTEM_PRODUCT_TYPES: Record<string, SystemProductTypeDefinition> = {
  SOLAR_PANEL: {
    code: 'solar_panel',
    name: 'Solar Panel',
    defaultPricingBasis: 'per_watt',
    defaultGstRate: 12,
    defaultUnitOfMeasure: 'pcs',
    sortOrder: 1,
    attributes: [
      {
        key: 'wattage',
        label: 'Wattage (Wp)',
        dataType: 'decimal',
        isRequired: true,
        isFilterable: true,
        group: 'core',
        sort: 1,
      },
      {
        key: 'technology',
        label: 'Technology',
        dataType: 'enum',
        isRequired: true,
        isFilterable: true,
        group: 'core',
        sort: 2,
        validation: {
          options: ['perc', 'topcon', 'mono_perc', 'poly', 'bifacial'],
        },
      },
      {
        key: 'is_dcr',
        label: 'DCR Approved',
        dataType: 'boolean',
        isRequired: true,
        isFilterable: true,
        group: 'core',
        sort: 3,
      },
      {
        key: 'min_wattage',
        label: 'Min Wattage (Wp)',
        dataType: 'decimal',
        isRequired: false,
        isFilterable: false,
        group: 'core',
        sort: 4,
      },
      {
        key: 'max_wattage',
        label: 'Max Wattage (Wp)',
        dataType: 'decimal',
        isRequired: false,
        isFilterable: false,
        group: 'core',
        sort: 5,
      },
    ],
  },
  INVERTER: {
    code: 'inverter',
    name: 'Inverter',
    defaultPricingBasis: 'per_unit',
    defaultGstRate: 12,
    defaultUnitOfMeasure: 'pcs',
    sortOrder: 2,
    attributes: [
      {
        key: 'capacity_kw',
        label: 'Capacity (kW)',
        dataType: 'decimal',
        isRequired: true,
        isFilterable: true,
        group: 'core',
        sort: 1,
      },
      {
        key: 'phase_type',
        label: 'Phase Type',
        dataType: 'enum',
        isRequired: true,
        isFilterable: true,
        group: 'core',
        sort: 2,
        validation: { options: ['single_phase', 'three_phase'] },
      },
    ],
  },
  MOUNTING_STRUCTURE: {
    code: 'mounting_structure',
    name: 'Mounting Structure',
    defaultPricingBasis: 'per_kw',
    defaultGstRate: 18,
    defaultUnitOfMeasure: 'pcs',
    sortOrder: 3,
    attributes: [
      {
        key: 'structure_type',
        label: 'Structure Type',
        dataType: 'enum',
        isRequired: true,
        isFilterable: true,
        group: 'core',
        sort: 1,
        validation: {
          options: [
            'aluminum_rail',
            'rcc_3x6',
            'elevated_6x9',
            'super_elevated',
            'ground_mount',
          ],
        },
      },
    ],
  },
};

export function getSystemAttributeKeys(code: SystemProductTypeCode): string[] {
  const def = Object.values(SYSTEM_PRODUCT_TYPES).find((d) => d.code === code);
  return def ? def.attributes.map((a) => a.key) : [];
}

export function isSystemProductTypeCode(code: string): boolean {
  return (SYSTEM_PRODUCT_TYPE_CODES as readonly string[]).includes(code);
}
