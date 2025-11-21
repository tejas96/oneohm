 
import dataSource from '../ormconfig';

/**
 * Inventory Module Seed Script
 * Seeds warehouses, vendors, purchase orders, stock, allocations, and dispatches
 *
 * Usage: npm run seed:inventory
 */
async function seedInventory(): Promise<void> {
  await dataSource.initialize();

  console.error('🏭 Starting Inventory Module seeding...\n');

  try {
    // ============================================
    // 1. SEED WAREHOUSES
    // ============================================
    console.error('📦 Seeding Warehouses...');

    await dataSource.query(`
      -- Main Warehouse (Bangalore)
      INSERT INTO warehouses (
        organization_id, name, code, address, city, state, pincode,
        coordinates, warehouse_type, warehouse_manager_id,
        contact_person, phone, email, status, created_by
      )
      SELECT
        org.id,
        'Main Warehouse - Bangalore',
        'WH-BLR-001',
        'Plot 45, Industrial Area, Peenya',
        'Bangalore',
        'Karnataka',
        '560058',
        '{"type": "Point", "coordinates": [77.5167, 13.0289]}'::jsonb,
        'own',
        u.id,
        'Ramesh Kumar',
        '+91-9876543230',
        'warehouse.blr@oneohm.com',
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;

      -- Secondary Warehouse (Mumbai)
      INSERT INTO warehouses (
        organization_id, name, code, address, city, state, pincode,
        coordinates, warehouse_type,
        contact_person, phone, email, status, created_by
      )
      SELECT
        org.id,
        'Regional Warehouse - Mumbai',
        'WH-MUM-001',
        'Godown 23, Andheri Industrial Estate',
        'Mumbai',
        'Maharashtra',
        '400053',
        '{"type": "Point", "coordinates": [72.8777, 19.0760]}'::jsonb,
        'own',
        'Suresh Patil',
        '+91-9876543231',
        'warehouse.mum@oneohm.com',
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;

      -- Third-Party Warehouse (Delhi)
      INSERT INTO warehouses (
        organization_id, name, code, address, city, state, pincode,
        warehouse_type, contact_person, phone, status, created_by
      )
      SELECT
        org.id,
        'Partner Warehouse - Delhi',
        'WH-DEL-TP1',
        'Sector 18, Okhla Industrial Area',
        'Delhi',
        'Delhi',
        '110020',
        'third_party',
        'Anil Verma',
        '+91-9876543232',
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;
    `);

    console.error('✓ Warehouses seeded (3 warehouses)');

    // ============================================
    // 2. SEED VENDORS
    // ============================================
    console.error('\n🤝 Seeding Vendors...');

    await dataSource.query(`
      -- Solar Panel Supplier
      INSERT INTO vendors (
        organization_id, name, code, vendor_type,
        contact_person, email, phone, alternate_phone,
        address, city, state, country, pincode,
        gstin, pan, payment_terms, credit_days,
        bank_name, account_number, ifsc_code,
        rating, status, notes, created_by
      )
      SELECT
        org.id,
        'Solar Panels India Pvt Ltd',
        'VEN-001',
        'supplier',
        'Rajesh Kumar',
        'sales@solarpanelsindia.com',
        '+91-9876543240',
        '+91-9876543241',
        '12 Solar Street, Hitech City',
        'Hyderabad',
        'Telangana',
        'India',
        '500081',
        '36ABCDE1234F1Z5',
        'ABCDE1234F',
        'Net 30 days from invoice date',
        30,
        'HDFC Bank',
        '50100023456789',
        'HDFC0002345',
        4.5,
        'active',
        'Premium solar panel supplier with quick delivery',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;

      -- Inverter Supplier
      INSERT INTO vendors (
        organization_id, name, code, vendor_type,
        contact_person, email, phone,
        address, city, state, country, pincode,
        gstin, pan, payment_terms, credit_days,
        bank_name, account_number, ifsc_code,
        rating, status, created_by
      )
      SELECT
        org.id,
        'Inverter Solutions Ltd',
        'VEN-002',
        'supplier',
        'Priya Sharma',
        'info@invertersolutions.com',
        '+91-9876543242',
        '45 Power Electronics Complex, Whitefield',
        'Bangalore',
        'Karnataka',
        'India',
        '560066',
        '29XYZAB5678C1Z5',
        'XYZAB5678C',
        'Net 45 days',
        45,
        'ICICI Bank',
        '60200034567890',
        'ICIC0003456',
        4.8,
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;

      -- Installation Contractor
      INSERT INTO vendors (
        organization_id, name, code, vendor_type,
        contact_person, email, phone,
        address, city, state, country, pincode,
        pan, payment_terms, credit_days,
        rating, status, notes, created_by
      )
      SELECT
        org.id,
        'Solar Install Experts',
        'VEN-003',
        'contractor',
        'Amit Patel',
        'amit@solarinstall.com',
        '+91-9876543243',
        '78 Installation Services Road',
        'Pune',
        'Maharashtra',
        'India',
        '411001',
        'DEFGH1234K',
        'Payment on milestone completion',
        15,
        4.2,
        'active',
        'Experienced installation team with good track record',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;

      -- Mounting Structure Supplier
      INSERT INTO vendors (
        organization_id, name, code, vendor_type,
        contact_person, email, phone,
        address, city, state, country, pincode,
        gstin, pan, credit_days,
        rating, status, created_by
      )
      SELECT
        org.id,
        'Aluminum Structures Co',
        'VEN-004',
        'supplier',
        'Vikram Singh',
        'sales@alstructures.com',
        '+91-9876543244',
        '23 Industrial Estate',
        'Faridabad',
        'Haryana',
        'India',
        '121003',
        '06MNOPQ9876D1Z5',
        'MNOPQ9876D',
        30,
        4.0,
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, code) DO NOTHING;
    `);

    console.error('✓ Vendors seeded (4 vendors)');

    // ============================================
    // 3. SEED PURCHASE ORDERS
    // ============================================
    console.error('\n📝 Seeding Purchase Orders...');

    await dataSource.query(`
      -- PO 1: Solar Panels (Received)
      INSERT INTO purchase_orders (
        organization_id, vendor_id, warehouse_id, project_id,
        po_number, po_date, po_type,
        expected_delivery_date, actual_delivery_date,
        subtotal, tax_amount, total_amount,
        payment_terms, payment_status, status,
        notes, terms_conditions, created_by
      )
      SELECT
        org.id,
        v.id,
        w.id,
        NULL,
        'PO-202401-0001',
        '2024-01-15'::date,
        'stock',
        '2024-02-15'::date,
        '2024-02-10'::date,
        500000.00,
        60000.00,
        560000.00,
        'Net 30 days',
        'pending',
        'received',
        'Bulk order for Q1 2024 stock',
        'Standard payment and delivery terms apply',
        u.id
      FROM organizations org, vendors v, warehouses w, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND v.code = 'VEN-001'
        AND w.code = 'WH-BLR-001'
        AND u.email = 'admin@oneohm.com'
        AND org.id = v.organization_id
        AND org.id = w.organization_id
      LIMIT 1
      ON CONFLICT (po_number) DO NOTHING;

      -- PO 2: Inverters (Partially Received)
      INSERT INTO purchase_orders (
        organization_id, vendor_id, warehouse_id,
        po_number, po_date, po_type,
        expected_delivery_date,
        subtotal, tax_amount, total_amount,
        payment_terms, payment_status, status,
        notes, created_by
      )
      SELECT
        org.id,
        v.id,
        w.id,
        'PO-202401-0002',
        '2024-01-20'::date,
        'stock',
        '2024-02-20'::date,
        850000.00,
        153000.00,
        1003000.00,
        'Net 45 days',
        'pending',
        'partially_received',
        'Inverter stock for upcoming projects',
        u.id
      FROM organizations org, vendors v, warehouses w, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND v.code = 'VEN-002'
        AND w.code = 'WH-BLR-001'
        AND u.email = 'admin@oneohm.com'
        AND org.id = v.organization_id
        AND org.id = w.organization_id
      LIMIT 1
      ON CONFLICT (po_number) DO NOTHING;

      -- PO 3: Mounting Structures (Confirmed)
      INSERT INTO purchase_orders (
        organization_id, vendor_id, warehouse_id,
        po_number, po_date, po_type,
        expected_delivery_date,
        subtotal, tax_amount, total_amount,
        payment_status, status,
        notes, created_by
      )
      SELECT
        org.id,
        v.id,
        w.id,
        'PO-202402-0001',
        '2024-02-01'::date,
        'stock',
        '2024-03-01'::date,
        300000.00,
        36000.00,
        336000.00,
        'pending',
        'confirmed',
        'Aluminum mounting structures',
        u.id
      FROM organizations org, vendors v, warehouses w, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND v.code = 'VEN-004'
        AND w.code = 'WH-MUM-001'
        AND u.email = 'admin@oneohm.com'
        AND org.id = v.organization_id
        AND org.id = w.organization_id
      LIMIT 1
      ON CONFLICT (po_number) DO NOTHING;
    `);

    console.error('✓ Purchase Orders seeded (3 POs)');

    // ============================================
    // 4. SEED PO ITEMS
    // ============================================
    console.error('\n📦 Seeding PO Items...');

    await dataSource.query(`
      -- PO-1 Items (Solar Panels - Fully Received)
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id,
        ordered_quantity, received_quantity,
        unit_price, tax_rate, line_total, notes
      )
      SELECT
        po.id,
        p.id,
        20.000,
        20.000,
        28000.00,
        12.0,
        560000.00,
        'Jinko 550W panels - Batch A'
      FROM purchase_orders po, products p
      WHERE po.po_number = 'PO-202401-0001'
        AND p.code = 'JINKO-550W'
      ON CONFLICT DO NOTHING;

      -- PO-2 Items (Inverters - Partially Received)
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id,
        ordered_quantity, received_quantity,
        unit_price, tax_rate, line_total, notes
      )
      SELECT
        po.id,
        p.id,
        10.000,
        6.000,
        85000.00,
        18.0,
        850000.00,
        'Growatt 5kW inverters - 6 of 10 received'
      FROM purchase_orders po, products p
      WHERE po.po_number = 'PO-202401-0002'
        AND p.code = 'GROWATT-5KW'
      ON CONFLICT DO NOTHING;

      -- PO-3 Items (Mounting - Not Yet Received)
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id,
        ordered_quantity, received_quantity,
        unit_price, tax_rate, line_total, notes
      )
      SELECT
        po.id,
        p.id,
        10.000,
        0.000,
        30000.00,
        12.0,
        300000.00,
        'Aluminum mounting kits - Awaiting delivery'
      FROM purchase_orders po, products p
      WHERE po.po_number = 'PO-202402-0001'
        AND p.code = 'MNT-ROOF-AL'
      ON CONFLICT DO NOTHING;
    `);

    console.error('✓ PO Items seeded (3 line items)');

    // ============================================
    // 5. SEED INVENTORY STOCK
    // ============================================
    console.error('\n📊 Seeding Inventory Stock...');

    await dataSource.query(`
      -- Jinko Solar Panels in Bangalore Warehouse
      INSERT INTO inventory_stock (
        organization_id, warehouse_id, product_id,
        available_quantity, reserved_quantity, in_transit_quantity,
        minimum_stock_level, reorder_quantity, maximum_stock_level,
        last_stock_in_date, last_stock_out_date
      )
      SELECT
        org.id,
        w.id,
        p.id,
        15.000,
        5.000,
        0.000,
        10.000,
        20.000,
        50.000,
        '2024-02-10'::date,
        '2024-02-15'::date
      FROM organizations org, warehouses w, products p
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-BLR-001'
        AND p.code = 'JINKO-550W'
        AND org.id = w.organization_id
      ON CONFLICT (warehouse_id, product_id) DO NOTHING;

      -- Trina Solar Panels in Mumbai Warehouse
      INSERT INTO inventory_stock (
        organization_id, warehouse_id, product_id,
        available_quantity, reserved_quantity, in_transit_quantity,
        minimum_stock_level, maximum_stock_level
      )
      SELECT
        org.id,
        w.id,
        p.id,
        8.000,
        2.000,
        10.000,
        5.000,
        30.000
      FROM organizations org, warehouses w, products p
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-MUM-001'
        AND p.code = 'TRINA-535W'
        AND org.id = w.organization_id
      ON CONFLICT (warehouse_id, product_id) DO NOTHING;

      -- Growatt Inverters in Bangalore
      INSERT INTO inventory_stock (
        organization_id, warehouse_id, product_id,
        available_quantity, reserved_quantity,
        minimum_stock_level, reorder_quantity, maximum_stock_level,
        last_stock_in_date
      )
      SELECT
        org.id,
        w.id,
        p.id,
        4.000,
        2.000,
        3.000,
        5.000,
        15.000,
        '2024-02-12'::date
      FROM organizations org, warehouses w, products p
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-BLR-001'
        AND p.code = 'GROWATT-5KW'
        AND org.id = w.organization_id
      ON CONFLICT (warehouse_id, product_id) DO NOTHING;

      -- Deye Hybrid Inverters in Mumbai
      INSERT INTO inventory_stock (
        organization_id, warehouse_id, product_id,
        available_quantity, reserved_quantity,
        minimum_stock_level, maximum_stock_level
      )
      SELECT
        org.id,
        w.id,
        p.id,
        3.000,
        1.000,
        2.000,
        10.000
      FROM organizations org, warehouses w, products p
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-MUM-001'
        AND p.code = 'DEYE-8KW-HYB'
        AND org.id = w.organization_id
      ON CONFLICT (warehouse_id, product_id) DO NOTHING;

      -- Pylontech Batteries (Low Stock Alert)
      INSERT INTO inventory_stock (
        organization_id, warehouse_id, product_id,
        available_quantity, reserved_quantity,
        minimum_stock_level, reorder_quantity, maximum_stock_level
      )
      SELECT
        org.id,
        w.id,
        p.id,
        2.000,
        0.000,
        5.000,
        10.000,
        20.000
      FROM organizations org, warehouses w, products p
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-BLR-001'
        AND p.code = 'PYLON-3.5KWH'
        AND org.id = w.organization_id
      ON CONFLICT (warehouse_id, product_id) DO NOTHING;

      -- Mounting Structures in Mumbai
      INSERT INTO inventory_stock (
        organization_id, warehouse_id, product_id,
        available_quantity, reserved_quantity,
        minimum_stock_level, maximum_stock_level,
        last_stock_in_date
      )
      SELECT
        org.id,
        w.id,
        p.id,
        6.000,
        4.000,
        3.000,
        20.000,
        '2024-01-25'::date
      FROM organizations org, warehouses w, products p
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-MUM-001'
        AND p.code = 'MNT-ROOF-AL'
        AND org.id = w.organization_id
      ON CONFLICT (warehouse_id, product_id) DO NOTHING;
    `);

    console.error('✓ Inventory Stock seeded (6 stock records)');

    // ============================================
    // 6. SEED INVENTORY TRANSACTIONS (Sample)
    // ============================================
    console.error('\n📝 Seeding Inventory Transactions...');

    await dataSource.query(`
      -- Purchase transaction for PO-1
      INSERT INTO inventory_transactions (
        organization_id, warehouse_id, product_id,
        transaction_type, quantity,
        reference_type, reference_id,
        transaction_date, notes, created_by
      )
      SELECT
        org.id,
        w.id,
        p.id,
        'purchase',
        20.000,
        'purchase_order',
        po.id,
        '2024-02-10 10:30:00'::timestamp,
        'Received from PO-202401-0001',
        u.id
      FROM organizations org, warehouses w, products p, purchase_orders po, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-BLR-001'
        AND p.code = 'JINKO-550W'
        AND po.po_number = 'PO-202401-0001'
        AND u.email = 'admin@oneohm.com'
        AND org.id = w.organization_id
      LIMIT 1
      ON CONFLICT DO NOTHING;

      -- Allocation transaction
      INSERT INTO inventory_transactions (
        organization_id, warehouse_id, product_id,
        transaction_type, quantity,
        reference_type,
        transaction_date, notes, created_by
      )
      SELECT
        org.id,
        w.id,
        p.id,
        'allocation',
        5.000,
        'stock_allocation',
        '2024-02-15 14:20:00'::timestamp,
        'Allocated for upcoming project',
        u.id
      FROM organizations org, warehouses w, products p, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND w.code = 'WH-BLR-001'
        AND p.code = 'JINKO-550W'
        AND u.email = 'admin@oneohm.com'
        AND org.id = w.organization_id
      ON CONFLICT DO NOTHING;

      -- Transfer transaction (out from Bangalore)
      INSERT INTO inventory_transactions (
        organization_id, warehouse_id, product_id,
        transaction_type, quantity,
        reference_type, from_warehouse_id, to_warehouse_id,
        transaction_date, notes, created_by
      )
      SELECT
        org.id,
        w_from.id,
        p.id,
        'transfer_out',
        3.000,
        'warehouse_transfer',
        w_from.id,
        w_to.id,
        '2024-02-12 09:00:00'::timestamp,
        'Transfer to Mumbai warehouse',
        u.id
      FROM organizations org, warehouses w_from, warehouses w_to, products p, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND w_from.code = 'WH-BLR-001'
        AND w_to.code = 'WH-MUM-001'
        AND p.code = 'GROWATT-5KW'
        AND u.email = 'admin@oneohm.com'
        AND org.id = w_from.organization_id
      LIMIT 1
      ON CONFLICT DO NOTHING;
    `);

    console.error('✓ Inventory Transactions seeded (3 transactions)');

    console.error('\n✅ Inventory Module seeding completed successfully!\n');
    console.error('📊 Inventory Seed Summary:');
    console.error('  - 3 Warehouses (2 own, 1 third-party)');
    console.error('  - 4 Vendors (2 suppliers, 1 contractor, 1 structure supplier)');
    console.error('  - 3 Purchase Orders (1 received, 1 partially received, 1 confirmed)');
    console.error('  - 3 PO Items (across different products)');
    console.error('  - 6 Stock Records (panels, inverters, batteries, mounting)');
    console.error('  - 3 Inventory Transactions (purchase, allocation, transfer)');
    console.error('');
    console.error('💡 Next Steps:');
    console.error('  - Run: npm run seed:inventory:projects (to create project-specific data)');
    console.error('  - Or use API to create stock allocations, material dispatches');
    console.error('');
  } catch (error) {
    console.error('\n❌ Error during inventory seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedInventory()
    .then(() => {
      console.error('✨ Inventory seed script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Inventory seed script failed:', error);
      process.exit(1);
    });
}

export { seedInventory };

