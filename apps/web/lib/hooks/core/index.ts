// Types
export type { BaseFilters, ResourceConfig } from './types';

// Utilities
export { stableHash, createResourceKeys } from './query-keys';
export { buildQueryParams } from './query-builder';
export { RESOURCE_QUERY_DEFAULTS, RESOURCE_MUTATION_DEFAULTS, STALE_TIMES } from './query-defaults';
export { normalizeApiError } from './error-adapter';

// Registry
export { defineResource, getResourceConfig, getResourcePermissions } from './resource-registry';

// Events
export { resourceEvents } from './resource-events';

// Hooks
export { useResourceList } from './use-resource-list';
export { useResourceDetail } from './use-resource-detail';
export { useResourceMutations } from './use-resource-mutations';
export { useResourceSubList } from './use-resource-sub-list';
export { useResourceStats } from './use-resource-stats';
export { useResourcePermissions } from './use-resource-permissions';
export { useFieldAvailability } from './use-field-availability';

// Companion hooks
export {
  useMutationWithToast,
  useDeleteConfirmation,
  useModalForm,
  FormTransformError,
} from './companions';
