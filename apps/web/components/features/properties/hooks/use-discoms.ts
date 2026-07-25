'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export interface DiscomResponse {
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
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedDiscomsResponse {
  data: DiscomResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const discomKeys = {
  all: ['discoms'] as const,
  lists: () => [...discomKeys.all, 'list'] as const,
  list: () => [...discomKeys.lists(), 'active'] as const,
  detail: (id: string) => [...discomKeys.all, 'detail', id] as const,
};

export function useDiscoms(enabled = true) {
  return useQuery({
    queryKey: discomKeys.list(),
    queryFn: async (): Promise<DiscomResponse[]> => {
      const { data } = await apiClient.get<PaginatedDiscomsResponse>('/discoms', {
        params: {
          isActive: true,
        },
      });
      return data.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useDiscomById(id?: string) {
  return useQuery({
    queryKey: discomKeys.detail(id ?? ''),
    queryFn: async (): Promise<DiscomResponse> => {
      const { data } = await apiClient.get<DiscomResponse>(`/discoms/${id}`, {
        params: { includeInactive: true },
      });
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}
