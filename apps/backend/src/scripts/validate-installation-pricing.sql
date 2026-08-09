-- Installation Pricing Data Quality Validation Queries
-- Run these after migration to ensure data integrity

-- 1. Check for overlapping ranges (updated for new schema without project_type/deleted_at)
SELECT COUNT(*) as conflicts
FROM installation_pricing a JOIN installation_pricing b
  ON a.id < b.id AND a.is_active = true AND b.is_active = true
WHERE (a.min_system_size_kw <= COALESCE(b.max_system_size_kw, 999999) 
       AND COALESCE(a.max_system_size_kw, 999999) >= b.min_system_size_kw)
HAVING COUNT(*) > 0;

-- 2. Check for invalid ranges
SELECT COUNT(*) as invalid_size_ranges FROM installation_pricing
WHERE min_system_size_kw > max_system_size_kw AND is_active = true;

-- 3. Check GST rate distribution
SELECT gst_rate, COUNT(*) FROM installation_pricing
WHERE is_active = true GROUP BY gst_rate;

-- 4. Check for empty cost components
SELECT COUNT(*) as empty_costs FROM installation_pricing
WHERE (cost_components IS NULL OR cost_components = '{}') AND is_active = true;

-- 5. Verify all rows have required cost components for validation
SELECT COUNT(*) as invalid_cost_components FROM installation_pricing
WHERE NOT (cost_components ? 'electrical_work' AND cost_components ? 'fixed_material')
   AND is_active = true;

-- 6. Check for rows with new cost keys that would be lost on rollback
SELECT COUNT(*) as rows_with_new_cost_keys FROM installation_pricing
WHERE (cost_components ? 'structure_cost'
   OR cost_components ? 'installation_labor'
   OR cost_components ? 'loading_unloading')
   AND is_active = true;

-- 7. Check for missing required fields
SELECT COUNT(*) as missing_required_fields FROM installation_pricing
WHERE (
   OR min_system_size_kw IS NULL 
   OR transport_rate_per_km IS NULL
   OR floor_increment_percent IS NULL
   OR gst_rate IS NULL
   OR cost_components IS NULL
   OR effective_from IS NULL
   OR is_active IS NULL);

-- 8. Verify effective date logic
SELECT COUNT(*) as invalid_date_ranges FROM installation_pricing
WHERE effective_to IS NOT NULL AND effective_from > effective_to;

-- 9. Check for duplicate tiers (should be 0 with unique constraint)
SELECT min_system_size_kw, max_system_size_kw, COUNT(*) as duplicates
FROM installation_pricing
WHERE is_active = true
GROUP BY min_system_size_kw, max_system_size_kw
HAVING COUNT(*) > 1;

-- 10. Summary statistics
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_rows,
    MIN(min_system_size_kw) as min_size,
    MAX(COALESCE(max_system_size_kw, 999)) as max_size,
    AVG(gst_rate) as avg_gst_rate
FROM installation_pricing;