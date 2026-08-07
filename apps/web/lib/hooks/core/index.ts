// Types
export type {
  BaseFilters,
  ResourceListResponse,
  NormalizedError,
  ResourceConfig,
  ResourcePermissionConfig,
  SubResourceConfig,
  MutationConfig,
  OptimisticConfig,
  MutationToastConfig,
  StatsConfig,
  FieldAvailabilityConfig,
  DeleteConfirmationOptions,
  ModalFormOptions,
  PaginationState,
  SortingState,
  ResourceEventType,
  ResourceEvent,
  ResourceSelector,
} from './types';

// Utilities
export { stableHash, createResourceKeys } from './query-keys';
export { buildQueryParams } from './query-builder';
export type { QueryBuildOptions } from './query-builder';
export { RESOURCE_QUERY_DEFAULTS, RESOURCE_MUTATION_DEFAULTS, STALE_TIMES } from './query-defaults';
export { defaultResponseAdapter } from './response-adapter';
export { normalizeApiError } from './error-adapter';

// Registry
export { defineResource, getResourceConfig, getResourcePermissions } from './resource-registry';

// Events
export { resourceEvents } from './resource-events';

// Hooks
export { useQueryState } from './use-query-state';
export type { UseQueryStateReturn } from './use-query-state';
export { useResourceList } from './use-resource-list';
export type { UseResourceListReturn } from './use-resource-list';
export { useResourceDetail, prefetchResourceDetail } from './use-resource-detail';
export { useResourceMutations } from './use-resource-mutations';
export type { UseResourceMutationsReturn } from './use-resource-mutations';
export { useResourceSubList } from './use-resource-sub-list';
export type { UseResourceSubListReturn } from './use-resource-sub-list';
export { useResourceStats, mapStatsToFilterTabs } from './use-resource-stats';
export type { UseResourceStatsReturn } from './use-resource-stats';
export { useInfiniteResourceList } from './use-infinite-resource-list';
export { useResourcePermissions } from './use-resource-permissions';
export type { ResourcePermissions } from './use-resource-permissions';
export { useFieldAvailability } from './use-field-availability';

// Companion hooks
export {
  useMutationWithToast,
  useDeleteConfirmation,
  useModalForm,
  FormTransformError,
} from './companions';
