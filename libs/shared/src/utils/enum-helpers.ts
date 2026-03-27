import { ProjectType } from '../types/enums/product.enum';

/**
 * Map property type (from lead) to project type
 */
export function mapPropertyTypeToProjectType(propertyType: string): ProjectType {
  const mapping: Record<string, ProjectType> = {
    residential: ProjectType.RESIDENTIAL,
    residential_apartment: ProjectType.RESIDENTIAL_APARTMENT,
    commercial: ProjectType.COMMERCIAL,
    industrial: ProjectType.INDUSTRIAL,
    agricultural: ProjectType.AGRICULTURAL,
    institutional: ProjectType.INSTITUTIONAL,
  };
  return mapping[propertyType.toLowerCase()] || ProjectType.RESIDENTIAL;
}

/**
 * Suggest phase type based on system size
 * ≤ 10 KW → Single Phase, > 10 KW → Three Phase
 */
export function suggestPhaseType(systemSizeKw: number): string {
  return systemSizeKw <= 10 ? 'single_phase' : 'three_phase';
}

/**
 * Check if subsidy is applicable for project type
 * Only residential projects are eligible for PM Surya Ghar
 */
export function isSubsidyEligible(projectType: ProjectType): boolean {
  return (
    projectType === ProjectType.RESIDENTIAL || projectType === ProjectType.RESIDENTIAL_APARTMENT
  );
}
