'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { isFixedRoleCode, type FixedRoleCode } from '@tejas96/shared';

import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export type FixedRolesAdapterErrorKind =
  | 'unsupported'
  | 'forbidden'
  | 'conflict'
  | 'validation'
  | 'not_found'
  | 'server'
  | 'network';

export class FixedRolesAdapterError extends Error {
  readonly kind: FixedRolesAdapterErrorKind;

  constructor(kind: FixedRolesAdapterErrorKind, message: string) {
    super(message);
    this.name = 'FixedRolesAdapterError';
    this.kind = kind;
  }
}

export interface FixedUserRolesAdapter {
  getUserRoles(userId: string): Promise<FixedRoleCode[]>;
  replaceUserRoles(userId: string, roles: FixedRoleCode[]): Promise<FixedRoleCode[]>;
  isSupported(): Promise<boolean>;
}

interface UserRolesResponse {
  roles: string[];
}

// ── Helpers ────────────────────────────────────────────────────

function parseCanonicalRoles(raw: string[]): FixedRoleCode[] {
  return raw.filter(isFixedRoleCode);
}

function mapAxiosError(error: AxiosError): FixedRolesAdapterError {
  const status = error.response?.status;

  if (!error.response) {
    return new FixedRolesAdapterError('network', 'Network error while accessing role data.');
  }

  switch (status) {
    case 403:
      return new FixedRolesAdapterError('forbidden', 'You are not allowed to manage these roles.');
    case 404:
      return new FixedRolesAdapterError('not_found', 'User or role endpoint was not found.');
    case 405:
    case 501:
      return new FixedRolesAdapterError(
        'unsupported',
        'Fixed-role assignment is not available on this server yet.',
      );
    case 409:
      return new FixedRolesAdapterError(
        'conflict',
        'Role assignment changed elsewhere. Review the current roles and try again.',
      );
    case 400:
    case 422:
      return new FixedRolesAdapterError('validation', 'One or more role codes are invalid.');
    default:
      if (status && status >= 500) {
        return new FixedRolesAdapterError('server', 'Server error while managing roles.');
      }
      return new FixedRolesAdapterError('network', 'Unexpected error while managing roles.');
  }
}

// ── Adapter ────────────────────────────────────────────────────

class HttpFixedUserRolesAdapter implements FixedUserRolesAdapter {
  async isSupported(): Promise<boolean> {
    try {
      await apiClient.options('/users/__probe__/roles');
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404 || axiosError.response?.status === 405) {
        return false;
      }
      // Endpoint may exist but probe user doesn't — treat as supported if not 405/501
      if (axiosError.response?.status === 501) {
        return false;
      }
      return axiosError.response !== undefined;
    }
  }

  async getUserRoles(userId: string): Promise<FixedRoleCode[]> {
    try {
      const response = await apiClient.get<UserRolesResponse>(`/users/${userId}/roles`);
      return parseCanonicalRoles(response.data.roles ?? []);
    } catch (error) {
      throw mapAxiosError(error as AxiosError);
    }
  }

  async replaceUserRoles(userId: string, roles: FixedRoleCode[]): Promise<FixedRoleCode[]> {
    try {
      const response = await apiClient.put<UserRolesResponse>(`/users/${userId}/roles`, {
        roles,
      });
      return parseCanonicalRoles(response.data.roles ?? []);
    } catch (error) {
      throw mapAxiosError(error as AxiosError);
    }
  }
}

export const fixedUserRolesAdapter: FixedUserRolesAdapter = new HttpFixedUserRolesAdapter();

export const fixedUserRolesKeys = {
  all: ['fixed-user-roles'] as const,
  user: (userId: string) => [...fixedUserRolesKeys.all, userId] as const,
  supported: () => [...fixedUserRolesKeys.all, 'supported'] as const,
};

// ── Hooks ──────────────────────────────────────────────────────

export function useFixedRolesSupported() {
  return useQuery({
    queryKey: fixedUserRolesKeys.supported(),
    queryFn: () => fixedUserRolesAdapter.isSupported(),
    staleTime: 60_000,
    retry: false,
  });
}

export function useFixedUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: fixedUserRolesKeys.user(userId ?? ''),
    queryFn: async () => {
      if (!userId) return [];
      return fixedUserRolesAdapter.getUserRoles(userId);
    },
    enabled: Boolean(userId),
    retry: (failureCount, error) => {
      if (error instanceof FixedRolesAdapterError && error.kind === 'unsupported') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useReplaceFixedUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roles,
    }: {
      userId: string;
      roles: FixedRoleCode[];
    }) => {
      const result = await fixedUserRolesAdapter.replaceUserRoles(userId, roles);
      const refetched = await fixedUserRolesAdapter.getUserRoles(userId);
      return refetched.length > 0 ? refetched : result;
    },
    onSuccess: (roles, { userId }) => {
      queryClient.setQueryData(fixedUserRolesKeys.user(userId), roles);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function getFixedRolesErrorMessage(error: unknown): string {
  if (error instanceof FixedRolesAdapterError) {
    return error.message;
  }
  return 'Failed to update roles. Please try again.';
}
