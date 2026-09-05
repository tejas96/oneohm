'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { showToast } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';

export interface DiscomGeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

export interface DiscomAdmin {
  id: string;
  circleName: string;
  circleInchargeName: string;
  divisionName: string;
  divisionInchargeName: string;
  testingUnitName?: string;
  subdivisionName?: string;
  subdivisionInchargeName?: string;
  aeqcEngineerName?: string;
  sectionName?: string;
  sectionEngineerName?: string;
  officeAddress?: string;
  mobileNo?: string;
  email?: string;
  geoLocation?: DiscomGeoLocation;
  label: string;
  isActive: boolean;
  linkedPropertiesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscomListStats {
  circles: number;
  active: number;
  linkedProperties: number;
}

export interface DiscomListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stats?: DiscomListStats;
  circleNames?: string[];
}

export interface DiscomListResponse {
  data: DiscomAdmin[];
  meta: DiscomListMeta;
}

export interface DiscomFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;
  circleName?: string;
  includeInactive?: boolean;
  enabled?: boolean;
}

export interface DiscomPayload {
  circleName: string;
  circleInchargeName: string;
  divisionName: string;
  divisionInchargeName: string;
  // Nullable so an emptied field can be cleared: PATCH drops undefined keys.
  testingUnitName?: string | null;
  subdivisionName?: string | null;
  subdivisionInchargeName?: string | null;
  aeqcEngineerName?: string | null;
  sectionName?: string | null;
  sectionEngineerName?: string | null;
  officeAddress?: string | null;
  mobileNo?: string | null;
  email?: string | null;
  geoLocation?: DiscomGeoLocation | null;
  isActive?: boolean;
}

const discomAdminKeys = {
  all: ['discoms-admin'] as const,
  lists: () => [...discomAdminKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...discomAdminKeys.lists(), filters] as const,
};

function buildDiscomParams(filters: DiscomFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('includeInactive', 'true');
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.circleName) params.set('circleName', filters.circleName);
  return params;
}

export function useDiscomsAdmin(
  filters: DiscomFilters = {},
): UseQueryResult<DiscomListResponse, AxiosError> {
  const { enabled: callerEnabled, ...queryFilters } = filters;

  return useQuery({
    queryKey: discomAdminKeys.list(queryFilters as Record<string, unknown>),
    queryFn: async (): Promise<DiscomListResponse> => {
      const params = buildDiscomParams(queryFilters);
      const { data } = await apiClient.get<DiscomListResponse>(`/discoms?${params.toString()}`);
      return data;
    },
    enabled: callerEnabled !== false,
    placeholderData: keepPreviousData,
  });
}

export function useDiscomMutations() {
  const queryClient = useQueryClient();

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: discomAdminKeys.all });
    await queryClient.invalidateQueries({ queryKey: ['discoms'] });
  };

  const create = useMutation({
    mutationFn: async (payload: DiscomPayload): Promise<DiscomAdmin> => {
      const { data } = await apiClient.post<DiscomAdmin>('/discoms', payload);
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      showToast.success('DISCOM created');
    },
    onError: (error: AxiosError) => {
      showToast.error(getErrorMessage(error));
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      data: payload,
    }: {
      id: string;
      data: Partial<DiscomPayload>;
    }): Promise<DiscomAdmin> => {
      const { data } = await apiClient.patch<DiscomAdmin>(`/discoms/${id}`, payload);
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      showToast.success('DISCOM updated');
    },
    onError: (error: AxiosError) => {
      showToast.error(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/discoms/${id}`);
    },
    onSuccess: async () => {
      await invalidate();
      showToast.success('DISCOM deleted');
    },
    onError: (error: AxiosError) => {
      showToast.error(getErrorMessage(error));
    },
  });

  return { create, update, remove, invalidate };
}
