import type {
  SiteActivityStatus,
  GpsCoordinates,
  ShadingAnalysis,
  SurveyData,
  PaginatedResponse,
} from '@oneohm-epc/shared/types';

import { apiClient } from './client';

export interface SiteActivity {
  id: string;
  organizationId: string;
  customerPropertyId: string;
  activityNumber: string;
  overallStatus: SiteActivityStatus;
  isSiteVisitDone: boolean;
  isSiteSurveyDone: boolean;
  completedBy?: string;
  completedAt?: string;
  gpsCoordinates?: GpsCoordinates;
  availableRoofAreaSqft?: number;
  shadingAnalysis?: ShadingAnalysis;
  notes?: string;
  surveyData?: SurveyData;
  surveyorId?: string;
  metadata?: Record<string, unknown>;
  customerProperty?: {
    id: string;
    propertyName?: string;
    propertyType: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    customer?: {
      id: string;
      firstName: string;
      lastName?: string;
      phone?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateSiteActivityPayload {
  propertyId: string;
  gpsCoordinates?: GpsCoordinates;
  availableRoofAreaSqft?: number;
  shadingAnalysis?: ShadingAnalysis;
  notes?: string;
}

export interface UpdateSiteActivityPayload {
  gpsCoordinates?: GpsCoordinates;
  availableRoofAreaSqft?: number;
  shadingAnalysis?: ShadingAnalysis;
  notes?: string;
  surveyData?: SurveyData;
}

function orgHeader(orgId?: string): Record<string, string> {
  return orgId ? { 'X-Organization-Id': orgId } : {};
}

export async function getSiteActivities(params?: {
  overallStatus?: SiteActivityStatus;
  propertyId?: string;
  isSiteVisitDone?: boolean;
  isSiteSurveyDone?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  organizationId?: string;
}): Promise<PaginatedResponse<SiteActivity>> {
  const { organizationId: orgId, ...queryParams } = params ?? {};
  const { data } = await apiClient.get<PaginatedResponse<SiteActivity>>('/site-activities', {
    params: queryParams,
    headers: orgHeader(orgId),
  });
  return data;
}

export async function getSiteActivity(id: string, organizationId?: string): Promise<SiteActivity> {
  const { data } = await apiClient.get<SiteActivity>(`/site-activities/${id}`, {
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function createSiteActivity(
  payload: CreateSiteActivityPayload,
  organizationId?: string,
): Promise<SiteActivity> {
  const { data } = await apiClient.post<SiteActivity>('/site-activities', payload, {
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function updateSiteActivity(
  id: string,
  payload: UpdateSiteActivityPayload,
  organizationId?: string,
): Promise<SiteActivity> {
  const { data } = await apiClient.patch<SiteActivity>(`/site-activities/${id}`, payload, {
    headers: orgHeader(organizationId),
  });
  return data;
}

export async function completeVisit(id: string, organizationId?: string): Promise<SiteActivity> {
  const { data } = await apiClient.post<SiteActivity>(
    `/site-activities/${id}/complete-visit`,
    {},
    {
      headers: orgHeader(organizationId),
    },
  );
  return data;
}

export async function completeSurvey(id: string, organizationId?: string): Promise<SiteActivity> {
  const { data } = await apiClient.post<SiteActivity>(
    `/site-activities/${id}/complete-survey`,
    {},
    {
      headers: orgHeader(organizationId),
    },
  );
  return data;
}

export async function cancelSiteActivity(
  id: string,
  organizationId?: string,
): Promise<SiteActivity> {
  const { data } = await apiClient.post<SiteActivity>(
    `/site-activities/${id}/cancel`,
    {},
    {
      headers: orgHeader(organizationId),
    },
  );
  return data;
}

export async function deleteSiteActivity(id: string, organizationId?: string): Promise<void> {
  await apiClient.delete(`/site-activities/${id}`, { headers: orgHeader(organizationId) });
}
