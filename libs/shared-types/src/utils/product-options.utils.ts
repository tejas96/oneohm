import type { PanelTechnology } from '../enums/product.enum';

// ============================================================================
// Input type — minimal product shape needed by derivation functions
// ============================================================================

export interface ProductOptionInput {
  id: string;
  name: string;
  brand?: string;
  specifications?: {
    panel?: {
      wattage?: number;
      technology?: string;
      minWattage?: number;
      maxWattage?: number;
    };
    inverter?: {
      capacityKw?: number;
      phaseType?: string;
    };
    structure?: {
      structureType?: string;
      material?: string;
      costMultiplier?: number;
    };
  };
}

// ============================================================================
// Option interfaces
// ============================================================================

export interface PanelTechnologyVariant {
  technology: PanelTechnology;
  wattageRange: string;
  minWattage: number;
  maxWattage: number;
  label: string;
}

export interface PanelBrandOption {
  value: string;
  label: string;
  wattageRange?: string;
  technologies: PanelTechnology[];
  technologyVariants: PanelTechnologyVariant[];
}

export interface InverterBrandOption {
  value: string;
  label: string;
  capacityRange?: string;
}

export interface StructureTypeOption {
  value: string;
  label: string;
  material?: string;
}

export interface InverterCapacityOption {
  value: number;
  label: string;
}

// ============================================================================
// Derivation functions
// ============================================================================

/**
 * Derive panel brand options from raw product data.
 * Groups by brand, collects wattage ranges and technology variants.
 */
export function derivePanelBrands(products: ProductOptionInput[]): PanelBrandOption[] {
  const brandMap = new Map<
    string,
    {
      wattages: number[];
      variants: Map<
        string,
        { technology: string; minWattage: number; maxWattage: number; count: number }
      >;
    }
  >();

  for (const product of products) {
    const brand = product.brand || 'Unknown';
    const wattage = product.specifications?.panel?.wattage || 0;
    const technology = product.specifications?.panel?.technology;
    const minWattage = product.specifications?.panel?.minWattage || wattage;
    const maxWattage = product.specifications?.panel?.maxWattage || wattage;

    if (!brandMap.has(brand)) {
      brandMap.set(brand, { wattages: [], variants: new Map() });
    }

    const info = brandMap.get(brand)!;
    if (wattage > 0) info.wattages.push(wattage);

    if (technology && minWattage && maxWattage) {
      const variantKey = `${technology}_${minWattage}_${maxWattage}`;
      if (!info.variants.has(variantKey)) {
        info.variants.set(variantKey, { technology, minWattage, maxWattage, count: 0 });
      }
      info.variants.get(variantKey)!.count += 1;
    }
  }

  const brands: PanelBrandOption[] = [];

  brandMap.forEach((info, name) => {
    const wattages = info.wattages.sort((a, b) => a - b);
    let wattageRange: string | undefined;
    if (wattages.length > 0) {
      const min = wattages[0];
      const max = wattages[wattages.length - 1];
      wattageRange = min === max ? `${min}W` : `${min}-${max}W`;
    }

    const technologyVariants: PanelTechnologyVariant[] = Array.from(info.variants.values())
      .map((v) => ({
        technology: v.technology as PanelTechnology,
        wattageRange: `${v.minWattage}-${v.maxWattage}Wp`,
        minWattage: v.minWattage,
        maxWattage: v.maxWattage,
        label: `${v.technology.toUpperCase()} ${v.minWattage}-${v.maxWattage}Wp`,
      }))
      .sort((a, b) => a.technology.localeCompare(b.technology) || a.minWattage - b.minWattage);

    const uniqueTechs = [...new Set(technologyVariants.map((v) => v.technology))];

    brands.push({
      value: name.toLowerCase(),
      label: name,
      wattageRange,
      technologies: uniqueTechs,
      technologyVariants,
    });
  });

  return brands.sort((a, b) => b.technologyVariants.length - a.technologyVariants.length);
}

/**
 * Derive inverter brand options from raw product data.
 * Groups by brand, collects capacity ranges.
 */
export function deriveInverterBrands(products: ProductOptionInput[]): InverterBrandOption[] {
  const brandMap = new Map<string, number[]>();

  for (const product of products) {
    const brand = product.brand || 'Unknown';
    const capacity = product.specifications?.inverter?.capacityKw || 0;

    if (!brandMap.has(brand)) brandMap.set(brand, []);
    if (capacity > 0) brandMap.get(brand)!.push(capacity);
  }

  const brands: InverterBrandOption[] = [];

  brandMap.forEach((capacities, name) => {
    const sorted = capacities.sort((a, b) => a - b);
    let capacityRange: string | undefined;
    if (sorted.length > 0) {
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      capacityRange = min === max ? `${min}KW` : `${min}-${max}KW`;
    }
    brands.push({ value: name.toLowerCase(), label: name, capacityRange });
  });

  return brands.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Derive structure type options from raw mounting structure product data.
 * Uses product name as label and structureType spec as value.
 */
export function deriveStructureTypes(products: ProductOptionInput[]): StructureTypeOption[] {
  const structureMap = new Map<string, StructureTypeOption>();

  for (const product of products) {
    const st = product.specifications?.structure?.structureType;
    if (st && !structureMap.has(st)) {
      structureMap.set(st, {
        value: st,
        label: product.name,
        material: product.specifications?.structure?.material,
      });
    }
  }

  return Array.from(structureMap.values());
}

/**
 * Derive available inverter capacities from raw product data,
 * filtered by optional phase type and brand.
 */
export function getInverterCapacities(
  products: ProductOptionInput[],
  phaseType?: string,
  brand?: string,
): InverterCapacityOption[] {
  let filtered = products;

  if (phaseType) {
    filtered = filtered.filter(
      (p) => p.specifications?.inverter?.phaseType === phaseType,
    );
  }
  if (brand) {
    filtered = filtered.filter(
      (p) => p.brand?.toLowerCase() === brand.toLowerCase(),
    );
  }

  const capacities = new Set<number>();
  for (const p of filtered) {
    const cap = p.specifications?.inverter?.capacityKw;
    if (cap && cap > 0) capacities.add(cap);
  }

  return Array.from(capacities)
    .sort((a, b) => a - b)
    .map((c) => ({ value: c, label: `${c} kW` }));
}
