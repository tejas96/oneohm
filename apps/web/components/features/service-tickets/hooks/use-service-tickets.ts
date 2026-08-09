'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ServiceTicketPhoto,
  type ServiceTicketPriority,
  type ServiceTicketStatus,
} from '@tejas96/shared/types';

import { showToast } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: ServiceTicketStatus;
  priority: ServiceTicketPriority;
  customerId: string;
  customerName: string;
  projectId: string;
  projectNumber: string;
  propertyId: string;
  assignedToEmployeeId: string | null;
  assigneeName: string | null;
  createdAt: string;
}

export interface ServiceTicketHistoryEntry {
  id: string;
  fromStatus: ServiceTicketStatus | null;
  toStatus: ServiceTicketStatus;
  note: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface ServiceTicketDetail extends ServiceTicket {
  description: string;
  propertyLabel: string;
  projectName: string;
  photos: ServiceTicketPhoto[] | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdByName: string | null;
  updatedAt: string;
  statusHistory: ServiceTicketHistoryEntry[];
}

export interface ServiceTicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
}

export interface ServiceTicketListParams {
  status?: ServiceTicketStatus[] | ServiceTicketStatus;
  priority?: ServiceTicketPriority[] | ServiceTicketPriority;
  customerId?: string;
  projectId?: string;
  propertyId?: string;
  assigneeId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ServiceTicketListResponse {
  items: ServiceTicket[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateServiceTicketInput {
  title: string;
  description: string;
  priority: ServiceTicketPriority;
  customerId: string;
  projectId: string;
  assignedToEmployeeId?: string;
  photos?: ServiceTicketPhoto[];
}

export type UpdateServiceTicketInput = Partial<
  Omit<CreateServiceTicketInput, 'customerId' | 'projectId'>
> & { id: string };

// ============================================================================
// Query keys
// ============================================================================

export const serviceTicketKeys = {
  all: () => ['service-tickets'] as const,
  lists: () => [...serviceTicketKeys.all(), 'list'] as const,
  list: (params: ServiceTicketListParams) => [...serviceTicketKeys.lists(), params] as const,
  stats: () => [...serviceTicketKeys.all(), 'stats'] as const,
  detail: (id: string) => [...serviceTicketKeys.all(), 'detail', id] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useServiceTickets(params: ServiceTicketListParams, enabled = true) {
  return useQuery({
    queryKey: serviceTicketKeys.list(params),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ServiceTicketListResponse> => {
      const { data } = await apiClient.get<ServiceTicketListResponse>('/service-tickets', {
        params,
      });
      return data;
    },
  });
}

export function useServiceTicketStats(enabled = true) {
  return useQuery({
    queryKey: serviceTicketKeys.stats(),
    enabled,
    queryFn: async (): Promise<ServiceTicketStats> => {
      const { data } = await apiClient.get<ServiceTicketStats>('/service-tickets/stats');
      return data;
    },
  });
}

export function useServiceTicket(id: string | null | undefined) {
  return useQuery({
    queryKey: serviceTicketKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.get<ServiceTicketDetail>(`/service-tickets/${id}`);
      return data;
    },
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useServiceTicketMutations() {
  const queryClient = useQueryClient();

  /**
   * Also busts the customers and projects caches: those lists carry the
   * active-tickets chip, so without this, closing the last active ticket would
   * leave a stale chip behind on screens the user navigates back to.
   */
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: serviceTicketKeys.all() });
    void queryClient.invalidateQueries({ queryKey: ['customers'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateServiceTicketInput): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.post<ServiceTicketDetail>('/service-tickets', input);
      return data;
    },
    onSuccess: (ticket) => {
      invalidate();
      showToast.success(`Ticket ${ticket.ticketNumber} created`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateServiceTicketInput): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.patch<ServiceTicketDetail>(`/service-tickets/${id}`, input);
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Ticket updated');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: ServiceTicketStatus;
      note?: string;
    }): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.patch<ServiceTicketDetail>(`/service-tickets/${id}/status`, {
        status,
        note,
      });
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Status updated');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/service-tickets/${id}`);
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Ticket deleted');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  return { create, update, updateStatus, remove };
}
