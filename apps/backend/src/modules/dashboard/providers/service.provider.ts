import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';

@Injectable()
export class ServiceProvider implements DashboardProvider {
  readonly key = 'service' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(_userId: string): Promise<OkSection> {
    return { status: 'ok', total: 0, criticalCount: 0, buckets: [] };
  }
}
