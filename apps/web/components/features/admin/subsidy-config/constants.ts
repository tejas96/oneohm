import { ProjectType, SubsidySchemeType } from '@oneohm-epc/shared/types';

import type { FilterTab } from '@/components/shared';

export const PROJECT_TYPE_TABS: FilterTab<ProjectType | 'all'>[] = [
  { id: 'all', label: 'All' },
  { id: ProjectType.RESIDENTIAL, label: 'Residential' },
  { id: ProjectType.RESIDENTIAL_APARTMENT, label: 'Apartment' },
  { id: ProjectType.COMMERCIAL, label: 'Commercial' },
  { id: ProjectType.INDUSTRIAL, label: 'Industrial' },
];

export const SCHEME_TYPE_OPTIONS = [
  { value: SubsidySchemeType.PM_SURYA_GHAR, label: 'PM Surya Ghar' },
  { value: SubsidySchemeType.STATE_SUBSIDY, label: 'State Subsidy' },
  { value: SubsidySchemeType.MNRE, label: 'MNRE' },
  { value: SubsidySchemeType.CUSTOM, label: 'Custom' },
];
