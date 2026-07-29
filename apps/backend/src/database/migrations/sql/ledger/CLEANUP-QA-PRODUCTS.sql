-- L14 — remove QA test fixtures from the customer-facing Structure Type picker.
--
-- DELIBERATELY NOT A MIGRATION. The target set is defined by human judgement, not
-- by a rule: "Towards Software Engineer" (LIA-001) matches no QA pattern yet is the
-- most disruptive row, and a migration matching `name ILIKE 'QA %'` would run against
-- production and could destroy a legitimately-named customer product. Run this by
-- hand, per environment, after reading step 0.
--
-- Verified on local (2026-07-29): all 20 rows are unreferenced — 0 bom_items,
-- 0 project_materials, 0 inventory_stock. Soft delete, so it is reversible with
-- `SET deleted_at = NULL`.
--
--   docker exec -i oneohm-postgres psql -U root -d oneohm_epc -v ON_ERROR_STOP=1 -f this-file.sql

-- ---------------------------------------------------------------------------
-- Step 0 — read the list before changing anything. Every ref count must be 0.
-- ---------------------------------------------------------------------------
SELECT p.id, p.name, p.code, p.status,
       p.specifications->>'structure_type' AS structure_type,
       (SELECT count(*) FROM bom_items b         WHERE b.product_id = p.id) AS bom_refs,
       (SELECT count(*) FROM project_materials m WHERE m.product_id = p.id) AS material_refs,
       (SELECT count(*) FROM inventory_stock i   WHERE i.product_id = p.id) AS stock_refs
  FROM products p
 WHERE p.organization_id = '9f6d06b2-d7b6-48f6-ba38-66af76c4ca27'
   AND p.product_type_id = 'a39d8acc-a1f1-45d0-8a5d-40ce89e9488e'
   AND p.deleted_at IS NULL
   AND (p.name ILIKE 'QA %' OR p.code LIKE 'QA-%' OR p.name IN ('nopr', 'inact'))
 ORDER BY p.name;

-- ---------------------------------------------------------------------------
-- Step 1 — soft-delete the fixtures. Aborts if the count is not exactly 20.
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE products
   SET deleted_at = now(), updated_at = now()
 WHERE organization_id = '9f6d06b2-d7b6-48f6-ba38-66af76c4ca27'
   AND product_type_id = 'a39d8acc-a1f1-45d0-8a5d-40ce89e9488e'
   AND deleted_at IS NULL
   AND (name ILIKE 'QA %' OR code LIKE 'QA-%' OR name IN ('nopr', 'inact'));

DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM products
   WHERE organization_id = '9f6d06b2-d7b6-48f6-ba38-66af76c4ca27'
     AND product_type_id = 'a39d8acc-a1f1-45d0-8a5d-40ce89e9488e'
     AND deleted_at IS NULL
     AND (name ILIKE 'QA %' OR code LIKE 'QA-%' OR name IN ('nopr', 'inact'));
  IF n <> 0 THEN
    RAISE EXCEPTION 'expected 0 QA rows remaining, found % — rolling back', n;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Step 2 — LIA-001, BY HAND. Not included above, on purpose.
--
-- "Towards Software Engineer" is a REAL product, not a fixture: structure_type
-- 'new_metal_roof', a live price, one bom_items row, and one quote snapshot
-- (QT-ONEOHM_EPC-2026-0314). Disabling it silently removes a roof type from the
-- catalogue. It needs renaming, and the right name is a business decision:
--
--   UPDATE products
--      SET name = 'New Metal Roof Mount', code = 'STRUCT-NEW-METAL-ROOF', updated_at = now()
--    WHERE id = '0f852498-9198-4364-a2b3-c345c6f54544';
--
-- Never hard-DELETE any of these: product_prices cascades (audit loss) and
-- bom_items has no FK, so the reference would orphan silently.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Verification — the picker query. Expect 5 legitimate rows plus LIA-001.
-- ---------------------------------------------------------------------------
SELECT p.name, p.code, p.status
  FROM products p
 WHERE p.organization_id = '9f6d06b2-d7b6-48f6-ba38-66af76c4ca27'
   AND p.product_type_id = 'a39d8acc-a1f1-45d0-8a5d-40ce89e9488e'
   AND p.deleted_at IS NULL AND p.status = 'active'
   AND EXISTS (SELECT 1 FROM product_prices pp
                WHERE pp.product_id = p.id AND pp.is_active
                  AND pp.effective_from <= CURRENT_DATE
                  AND (pp.effective_to IS NULL OR pp.effective_to >= CURRENT_DATE))
 ORDER BY p.name;
