import { LookupTypeCode, LookupScopeType } from '@tejas96/shared/types';
import type { MigrationInterface, QueryRunner } from 'typeorm';

type LookupSeed = {
  typeCode: LookupTypeCode;
  code: string;
  label: string;
  orderIndex: number;
  color: string;
};

const LOOKUP_SEEDS: LookupSeed[] = [
  {
    typeCode: LookupTypeCode.PRIORITY,
    code: 'urgent',
    label: 'Urgent',
    orderIndex: 1,
    color: '#EF4444',
  },
  {
    typeCode: LookupTypeCode.PRIORITY,
    code: 'high',
    label: 'High',
    orderIndex: 2,
    color: '#F59E0B',
  },
  {
    typeCode: LookupTypeCode.PRIORITY,
    code: 'medium',
    label: 'Medium',
    orderIndex: 3,
    color: '#3B82F6',
  },
  {
    typeCode: LookupTypeCode.PRIORITY,
    code: 'normal',
    label: 'Normal',
    orderIndex: 4,
    color: '#6B7280',
  },
  { typeCode: LookupTypeCode.PRIORITY, code: 'low', label: 'Low', orderIndex: 5, color: '#6B7280' },
  {
    typeCode: LookupTypeCode.DEFAULT_TASK_STATUS,
    code: 'backlog',
    label: 'Backlog',
    orderIndex: 1,
    color: '#6B7280',
  },
  {
    typeCode: LookupTypeCode.DEFAULT_TASK_STATUS,
    code: 'in_progress',
    label: 'In Progress',
    orderIndex: 2,
    color: '#3B82F6',
  },
  {
    typeCode: LookupTypeCode.DEFAULT_TASK_STATUS,
    code: 'blocked',
    label: 'Blocked',
    orderIndex: 3,
    color: '#EF4444',
  },
  {
    typeCode: LookupTypeCode.DEFAULT_TASK_STATUS,
    code: 'done',
    label: 'Done',
    orderIndex: 4,
    color: '#22C55E',
  },
];

export class SeedLookupPrioritiesAndDefaultTaskStatuses1806000000000 implements MigrationInterface {
  name = 'SeedLookupPrioritiesAndDefaultTaskStatuses1806000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const seed of LOOKUP_SEEDS) {
      await queryRunner.query(
        `
          UPDATE lookups
          SET
            label = $3,
            order_index = $4,
            color = $5,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
          WHERE
            type_code = $1
            AND code = $2
            AND scope_type = $6
            AND scope_id IS NULL
            AND deleted_at IS NULL
        `,
        [seed.typeCode, seed.code, seed.label, seed.orderIndex, seed.color, LookupScopeType.GLOBAL],
      );

      await queryRunner.query(
        `
          INSERT INTO lookups (
            id,
            type_code,
            code,
            label,
            scope_type,
            scope_id,
            order_index,
            color,
            is_active,
            created_at,
            updated_at
          )
          SELECT
            gen_random_uuid(),
            $1::varchar,
            $2::varchar,
            $3::varchar,
            $6::varchar,
            NULL,
            $4::int,
            $5::varchar,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          WHERE NOT EXISTS (
            SELECT 1
            FROM lookups
            WHERE
              type_code = $1::varchar
              AND code = $2::varchar
              AND scope_type = $6::varchar
              AND scope_id IS NULL
              AND deleted_at IS NULL
          )
        `,
        [seed.typeCode, seed.code, seed.label, seed.orderIndex, seed.color, LookupScopeType.GLOBAL],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const seed of LOOKUP_SEEDS) {
      await queryRunner.query(
        `
          DELETE FROM lookups
          WHERE
            type_code = $1
            AND code = $2
            AND scope_type = $3
            AND scope_id IS NULL
            AND deleted_at IS NULL
        `,
        [seed.typeCode, seed.code, LookupScopeType.GLOBAL],
      );
    }
  }
}
