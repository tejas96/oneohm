import type { ReportSchema } from '@tejas96/shared/reports';

export interface ReportEngineContext {
  organizationId: string;
  entityType: import('@tejas96/shared/types').DocumentEntityType;
  entityId: string;
  userId: string;
}

export interface ReportDataProvider<TRaw> {
  fetch(ctx: ReportEngineContext): Promise<TRaw>;
}

export interface ReportMapper<TRaw, TViewModel extends Record<string, string>> {
  toViewModel(raw: TRaw): TViewModel;
}

export interface ReportPlugin<TRaw, TViewModel extends Record<string, string>> {
  readonly id: string;
  readonly schema: ReportSchema;
  readonly templateFile: string;
  readonly provider: ReportDataProvider<TRaw>;
  readonly mapper: ReportMapper<TRaw, TViewModel>;
}
