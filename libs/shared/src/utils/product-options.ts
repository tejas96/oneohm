import { normalizeStructureTypeCode } from './structure-type';

export interface ProductOptionInput {
  id: string;
  name: string;
  brandId?: string;
  brand?: { id: string; name: string } | string;
  specifications?: {
    wattage?: number;
    technology?: string;
    min_wattage?: number;
    max_wattage?: number;
    is_dcr?: boolean;
    efficiency?: number;
    capacity_kw?: number;
    phase_type?: string;
    voltage?: string;
    structure_type?: string;
    material?: string;
    weight_kg?: number;
  };
}

export interface PanelTechnologyVariant {
  technology: string;
  wattageRange: string;
  minWattage: number;
  maxWattage: number;
  label: string;
}

export interface PanelBrandOption {
  value: string;
  label: string;
  wattageRange?: string;
  technologies: string[];
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

function getBrandName(product: ProductOptionInput): string {
  if (typeof product.brand === 'string') return product.brand || 'Unknown';
  if (product.brand && typeof product.brand === 'object') return product.brand.name || 'Unknown';
  return 'Unknown';
}

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
    const brand = getBrandName(product);
    const wattage = product.specifications?.wattage || 0;
    const technology = product.specifications?.technology;
    const minWattage = product.specifications?.min_wattage || wattage;
    const maxWattage = product.specifications?.max_wattage || wattage;

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
        technology: v.technology,
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

export function deriveInverterBrands(products: ProductOptionInput[]): InverterBrandOption[] {
  const brandMap = new Map<string, number[]>();

  for (const product of products) {
    const brand = getBrandName(product);
    const capacity = product.specifications?.capacity_kw || 0;

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

export function deriveStructureTypes(products: ProductOptionInput[]): StructureTypeOption[] {
  const structureMap = new Map<string, StructureTypeOption>();

  for (const product of products) {
    const raw = product.specifications?.structure_type;
    if (typeof raw !== 'string' || !raw.trim()) continue;

    const structureType = normalizeStructureTypeCode(raw);
    if (!structureType) continue;

    if (!structureMap.has(structureType)) {
      structureMap.set(structureType, {
        value: structureType,
        label: product.name,
        material: product.specifications?.material,
      });
    }
  }

  return Array.from(structureMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function getInverterCapacities(
  products: ProductOptionInput[],
  phaseType?: string,
  brand?: string,
): InverterCapacityOption[] {
  let filtered = products;

  if (brand) {
    filtered = filtered.filter((p) => {
      const bName = getBrandName(p);
      return bName.toLowerCase() === brand.toLowerCase();
    });
  }

  // Filter by phase type — if no matches found, fall back to all (phase_type not set on products)
  if (phaseType) {
    const phaseFiltered = filtered.filter(
      (p) => !p.specifications?.phase_type || p.specifications.phase_type === phaseType,
    );
    filtered = phaseFiltered;
  }

  const capacities = new Set<number>();
  for (const p of filtered) {
    const cap = p.specifications?.capacity_kw;
    if (cap && cap > 0) capacities.add(cap);
  }

  return Array.from(capacities)
    .sort((a, b) => a - b)
    .map((c) => ({ value: c, label: `${c} kW` }));
}
