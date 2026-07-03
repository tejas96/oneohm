import { BadRequestException, Injectable } from '@nestjs/common';
import { validateAndSanitizeReportFields } from '@tejas96/shared/reports';

@Injectable()
export class FieldResolverService {
  mergeFields<T extends Record<string, string>>(
    defaults: T,
    draft?: Partial<T>,
    overrides?: Partial<T>,
  ): T {
    const merged = { ...defaults };

    if (draft) {
      for (const [key, value] of Object.entries(draft)) {
        if (key in merged && value != null) {
          merged[key as keyof T] = String(value) as T[keyof T];
        }
      }
    }

    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        if (key in merged && value != null) {
          merged[key as keyof T] = String(value) as T[keyof T];
        }
      }
    }

    return merged;
  }

  validateFields(reportId: string, fields: Record<string, string>): Record<string, string> {
    try {
      return validateAndSanitizeReportFields(reportId, fields);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid report fields';
      throw new BadRequestException(message);
    }
  }
}
