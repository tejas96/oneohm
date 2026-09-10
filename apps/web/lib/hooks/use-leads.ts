import type { CustomerStatus, LeadTemperature } from '@tejas96/shared/types';

/**
 * Lead query keys for cache management
 */
const leadKeys = {
  all: () => ['leads'] as const,
  lists: () => [...leadKeys.all(), 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all(), 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

/**
 * Lead filters interface
 */
interface LeadFilters {
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  temperature?: LeadTemperature;
  search?: string;
  assignedTo?: string;
}
