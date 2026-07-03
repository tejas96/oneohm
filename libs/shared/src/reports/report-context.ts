import type { DocumentEntityType } from '../types/enums/document.enum';

export interface ReportContextDto {
  entityType: DocumentEntityType;
  entityId: string;
}

export interface ReportEngineContext extends ReportContextDto {
  organizationId: string;
  userId: string;
}
