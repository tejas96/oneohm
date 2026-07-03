import { NotFoundException } from '@nestjs/common';

export class ReportNotFoundException extends NotFoundException {
  constructor(reportId: string) {
    super(`Report not found: ${reportId}`);
  }
}
