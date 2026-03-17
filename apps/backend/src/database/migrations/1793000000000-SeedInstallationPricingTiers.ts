import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces legacy single-KW point-range rows (min=max) with 6 proper tiered ranges.
 * Skips orgs that already have any tiered rows to avoid overwriting custom pricing.
 */
export class SeedInstallationPricingTiers1793000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove stale single-KW rows only for orgs that have no tiered rows.
    await queryRunner.query(`
      DELETE FROM installation_pricing ip
      WHERE ip.min_system_size_kw = ip.max_system_size_kw
        AND NOT EXISTS (
          SELECT 1
          FROM installation_pricing ip2
          WHERE ip2.organization_id = ip.organization_id
            AND (ip2.max_system_size_kw IS NULL OR ip2.min_system_size_kw <> ip2.max_system_size_kw)
        )
    `);

    // Re-seed with proper tiered ranges for every organisation that now has no rows.
    // Uses a cross join so we insert one set of tiers per org.
    await queryRunner.query(`
      INSERT INTO installation_pricing (
        organization_id,
        min_system_size_kw,
        max_system_size_kw,
        transport_rate_per_km,
        floor_increment_percent,
        gst_rate,
        cost_components,
        effective_from,
        is_active,
        created_at,
        updated_at
      )
      SELECT
        o.id,
        t.min_kw,
        t.max_kw,
        t.transport,
        25,
        18,
        t.costs::jsonb,
        CURRENT_DATE,
        true,
        NOW(),
        NOW()
      FROM organizations o
      CROSS JOIN (VALUES
        (1,  2.99,  25, '{"electrical_work":12000,"fixed_material":6000,"variable_floor":1500,"structure_cost":13336,"installation_labor":3000,"msedcl_charges":4000,"loading_unloading":1500,"profitability_percent":18}'),
        (3,  4.99,  30, '{"electrical_work":15000,"fixed_material":8000,"variable_floor":2000,"structure_cost":16670,"installation_labor":5000,"msedcl_charges":5000,"loading_unloading":2000,"profitability_percent":16}'),
        (5,  9.99, 35, '{"electrical_work":20000,"fixed_material":10000,"variable_floor":2500,"structure_cost":22000,"installation_labor":8000,"msedcl_charges":6000,"loading_unloading":2500,"profitability_percent":15}'),
        (10, 19.99, 40, '{"electrical_work":30000,"fixed_material":15000,"variable_floor":3000,"structure_cost":33000,"installation_labor":12000,"msedcl_charges":8000,"loading_unloading":3000,"profitability_percent":14}'),
        (20, 49.99, 50, '{"electrical_work":50000,"fixed_material":25000,"variable_floor":4000,"structure_cost":55000,"installation_labor":20000,"msedcl_charges":12000,"loading_unloading":5000,"profitability_percent":12}'),
        (50, NULL, 60, '{"electrical_work":80000,"fixed_material":40000,"variable_floor":5000,"structure_cost":88000,"installation_labor":35000,"msedcl_charges":20000,"loading_unloading":8000,"profitability_percent":10}')
      ) AS t(min_kw, max_kw, transport, costs)
      WHERE NOT EXISTS (
        SELECT 1 FROM installation_pricing ip WHERE ip.organization_id = o.id
      )
      ON CONFLICT (organization_id, min_system_size_kw, max_system_size_kw) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the tiered rows added by this migration
    await queryRunner.query(`
      DELETE FROM installation_pricing
      WHERE (min_system_size_kw, max_system_size_kw) IN (
        (1, 2.99), (3, 4.99), (5, 9.99), (10, 19.99), (20, 49.99)
      )
      OR (min_system_size_kw = 50 AND max_system_size_kw IS NULL)
    `);
  }
}
