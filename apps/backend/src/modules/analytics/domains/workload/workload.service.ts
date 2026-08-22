import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  type WorkloadDepartmentDto,
  type WorkloadResponseDto,
  type WorkloadStepDto,
} from './dto/workload.dto';
import { WORKLOAD_BY_STEP_SQL } from './helpers/workload.sql';

interface StepRow {
  department: string;
  stepId: string;
  stepName: string;
  standardDays: number | null;
  pending: number;
  completed: number;
  completedAllTime: number;
}

/** The month so far, matching what the dashboard's own range control shows. */
function defaultRange(now: Date): { from: string; to: string } {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${pad(now.getDate())}` };
}

@Injectable()
export class WorkloadService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Pending and completed task counts, per department and per workflow step.
   *
   * Grouping is by `workflow_steps.default_department`, which migration
   * 1855700000000 normalised — three steps were filed under near-miss spellings
   * of a real department and would otherwise have shown as their own columns.
   */
  async getWorkload(query: {
    fromDate?: string;
    toDate?: string;
    department?: string;
  }): Promise<WorkloadResponseDto> {
    const fallback = defaultRange(new Date());
    const from = query.fromDate ?? fallback.from;
    const to = query.toDate ?? fallback.to;

    const rows: StepRow[] = await this.dataSource.query(WORKLOAD_BY_STEP_SQL, [
      from,
      to,
      query.department ?? null,
    ]);

    const byDepartment = new Map<string, WorkloadDepartmentDto>();

    for (const row of rows) {
      let dept = byDepartment.get(row.department);
      if (!dept) {
        dept = {
          department: row.department,
          pending: 0,
          completed: 0,
          completedAllTime: 0,
          steps: [],
        };
        byDepartment.set(row.department, dept);
      }

      const step: WorkloadStepDto = {
        stepId: row.stepId,
        stepName: row.stepName,
        pending: Number(row.pending),
        completed: Number(row.completed),
        completedAllTime: Number(row.completedAllTime),
        standardDays: row.standardDays === null ? null : Number(row.standardDays),
      };

      dept.steps.push(step);
      // Department totals are SUMMED FROM the steps, never queried separately,
      // so a department row can never disagree with the rows beneath it.
      dept.pending += step.pending;
      dept.completed += step.completed;
      dept.completedAllTime += step.completedAllTime;
    }

    const departments = [...byDepartment.values()].sort((a, b) => b.pending - a.pending);

    return {
      fromDate: from,
      toDate: to,
      departments,
      totalPending: departments.reduce((sum, d) => sum + d.pending, 0),
      totalCompleted: departments.reduce((sum, d) => sum + d.completed, 0),
    };
  }
}
