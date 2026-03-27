'use client';

/**
 * Site Activity feature hooks — re-exports from FDAL resource layer.
 * Single source of truth: lib/hooks/resources/site-activities.ts
 */

export {
  useSiteActivityByProperty,
  useCompleteVisit,
  useCompleteSurvey,
} from '@/lib/hooks/resources/site-activities';
