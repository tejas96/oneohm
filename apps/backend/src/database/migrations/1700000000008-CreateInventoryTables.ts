import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: CreateInventoryTables
 * Module 13: Inventory Management
 *
 * Creates 10 tables for complete inventory management:
 * 1. warehouses - Storage locations
 * 2. inventory_stock - Real-time stock levels
 * 3. vendors - Supplier management
 * 4. project_vendors - Vendor-project relationships
 * 5. purchase_orders - Procurement orders
 * 6. purchase_order_items - PO line items
 * 7. inventory_transactions - All stock movements
 * 8. stock_allocations - Project reservations
 * 9. material_dispatches - Delivery tracking
 * 10. material_dispatch_items - Dispatch details
 */
export class CreateInventoryTables1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // TABLE: warehouses
    // ============================================
    await queryRunner.query(`
      CREATE TABLE warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        
        -- Location
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        coordinates JSONB,
        
        -- Type: own, third_party
        warehouse_type VARCHAR(50) DEFAULT 'own' CHECK (warehouse_type IN ('own', 'third_party')),
        
        -- Manager
        warehouse_manager_id UUID,
        
        -- Contact
        contact_person VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        
        -- Status: active, inactive
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        CONSTRAINT uq_warehouses_org_code UNIQUE(organization_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_warehouses_organization ON warehouses(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_warehouses_type ON warehouses(warehouse_type) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_warehouses_manager ON warehouses(warehouse_manager_id);
    `);

    // ============================================
    // TABLE: inventory_stock
    // ============================================
    await queryRunner.query(`
      CREATE TABLE inventory_stock (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        warehouse_id UUID NOT NULL,
        product_id UUID NOT NULL,
        
        -- Stock Levels
        available_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
        reserved_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
        in_transit_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
        
        -- Reorder Settings
        minimum_stock_level DECIMAL(15,3),
        reorder_quantity DECIMAL(15,3),
        maximum_stock_level DECIMAL(15,3),
        
        -- Last Activity
        last_stock_in_date DATE,
        last_stock_out_date DATE,
        
        -- Audit
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT uq_inventory_stock_warehouse_product UNIQUE(warehouse_id, product_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_stock_warehouse ON inventory_stock(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_stock_product ON inventory_stock(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_stock_low_stock ON inventory_stock(warehouse_id, product_id) 
        WHERE available_quantity <= minimum_stock_level;
    `);

    // ============================================
    // TABLE: vendors
    // ============================================
    await queryRunner.query(`
      CREATE TABLE vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        
        -- Vendor Type: supplier, contractor, service_provider
        vendor_type VARCHAR(50) DEFAULT 'supplier' CHECK (vendor_type IN ('supplier', 'contractor', 'service_provider')),
        
        -- Contact
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        alternate_phone VARCHAR(20),
        
        -- Address
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10),
        
        -- Tax Details
        gstin VARCHAR(15),
        pan VARCHAR(10),
        
        -- Payment Terms
        payment_terms TEXT,
        credit_days INTEGER,
        
        -- Bank Details
        bank_name VARCHAR(255),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        
        -- Status: active, inactive, blacklisted
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
        
        -- Rating
        rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        CONSTRAINT uq_vendors_org_code UNIQUE(organization_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vendors_organization ON vendors(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vendors_type ON vendors(vendor_type) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vendors_status ON vendors(status) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // TABLE: project_vendors
    // ============================================
    await queryRunner.query(`
      CREATE TABLE project_vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        vendor_id UUID NOT NULL,
        
        -- Vendor Role in Project
        vendor_role VARCHAR(100),
        
        -- Contract Details
        contract_value DECIMAL(15,2),
        contract_start_date DATE,
        contract_end_date DATE,
        
        -- Status: active, completed, terminated
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        created_by UUID,
        
        CONSTRAINT uq_project_vendors_project_vendor_role UNIQUE(project_id, vendor_id, vendor_role)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_vendors_project ON project_vendors(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_vendors_vendor ON project_vendors(vendor_id);
    `);

    // ============================================
    // TABLE: purchase_orders
    // ============================================
    await queryRunner.query(`
      CREATE TABLE purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        vendor_id UUID NOT NULL,
        warehouse_id UUID,
        project_id UUID,
        
        -- PO Info
        po_number VARCHAR(50) UNIQUE NOT NULL,
        po_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- PO Type: stock, project_specific
        po_type VARCHAR(50) DEFAULT 'stock' CHECK (po_type IN ('stock', 'project_specific')),
        
        -- Delivery
        expected_delivery_date DATE,
        actual_delivery_date DATE,
        
        -- Financial
        subtotal DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) NOT NULL,
        
        -- Payment: pending, partial, paid
        payment_terms TEXT,
        payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
        
        -- Approval
        approval_request_id UUID,
        
        -- Status: draft, pending_approval, approved, sent, confirmed, partially_received, received, cancelled
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
          'draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'
        )),
        
        -- Notes
        notes TEXT,
        terms_conditions TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_orders_organization ON purchase_orders(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_orders_warehouse ON purchase_orders(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_orders_project ON purchase_orders(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_orders_status ON purchase_orders(status) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // TABLE: purchase_order_items
    // ============================================
    await queryRunner.query(`
      CREATE TABLE purchase_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL,
        product_id UUID NOT NULL,
        
        -- Quantity
        ordered_quantity DECIMAL(15,3) NOT NULL,
        received_quantity DECIMAL(15,3) DEFAULT 0,
        
        -- Pricing
        unit_price DECIMAL(15,2) NOT NULL,
        tax_rate DECIMAL(5,2),
        line_total DECIMAL(15,2) NOT NULL,
        
        -- Notes
        notes TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);
    `);

    // ============================================
    // TABLE: inventory_transactions
    // ============================================
    await queryRunner.query(`
      CREATE TABLE inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        warehouse_id UUID NOT NULL,
        product_id UUID NOT NULL,
        
        -- Transaction Type: purchase, sale, transfer_in, transfer_out, adjustment, allocation, dispatch, return
        transaction_type VARCHAR(50) NOT NULL,
        
        -- Quantity
        quantity DECIMAL(15,3) NOT NULL,
        
        -- Reference
        reference_type VARCHAR(50),
        reference_id UUID,
        
        -- Batch/Serial
        batch_number VARCHAR(100),
        serial_number VARCHAR(100),
        
        -- Transaction Date
        transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        -- Transfer Details
        from_warehouse_id UUID,
        to_warehouse_id UUID,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_warehouse ON inventory_transactions(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(transaction_date);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
    `);

    // ============================================
    // TABLE: stock_allocations
    // ============================================
    await queryRunner.query(`
      CREATE TABLE stock_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        project_id UUID NOT NULL,
        warehouse_id UUID NOT NULL,
        product_id UUID NOT NULL,
        
        -- Allocation
        allocated_quantity DECIMAL(15,3) NOT NULL,
        dispatched_quantity DECIMAL(15,3) DEFAULT 0,
        returned_quantity DECIMAL(15,3) DEFAULT 0,
        
        -- Source Type: own, third_party
        source_type VARCHAR(50) DEFAULT 'own' CHECK (source_type IN ('own', 'third_party')),
        
        -- Status: allocated, partially_dispatched, dispatched, completed, cancelled
        status VARCHAR(50) DEFAULT 'allocated' CHECK (status IN (
          'allocated', 'partially_dispatched', 'dispatched', 'completed', 'cancelled'
        )),
        
        -- Dates
        allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        dispatched_at TIMESTAMP WITH TIME ZONE,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_allocations_project ON stock_allocations(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_allocations_warehouse ON stock_allocations(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_allocations_product ON stock_allocations(product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stock_allocations_status ON stock_allocations(status);
    `);

    // ============================================
    // TABLE: material_dispatches
    // ============================================
    await queryRunner.query(`
      CREATE TABLE material_dispatches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        project_id UUID NOT NULL,
        warehouse_id UUID NOT NULL,
        
        -- Dispatch Info
        dispatch_number VARCHAR(50) UNIQUE NOT NULL,
        dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Delivery
        expected_delivery_date DATE,
        actual_delivery_date DATE,
        
        -- Transport
        vehicle_number VARCHAR(50),
        driver_name VARCHAR(255),
        driver_phone VARCHAR(20),
        transport_company VARCHAR(255),
        
        -- Status: prepared, dispatched, in_transit, delivered, partially_delivered, cancelled
        status VARCHAR(50) DEFAULT 'prepared' CHECK (status IN (
          'prepared', 'dispatched', 'in_transit', 'delivered', 'partially_delivered', 'cancelled'
        )),
        
        -- Delivery Confirmation
        delivered_by VARCHAR(255),
        received_by VARCHAR(255),
        receiver_signature TEXT,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_material_dispatches_project ON material_dispatches(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_material_dispatches_warehouse ON material_dispatches(warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_material_dispatches_status ON material_dispatches(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_material_dispatches_date ON material_dispatches(dispatch_date);
    `);

    // ============================================
    // TABLE: material_dispatch_items
    // ============================================
    await queryRunner.query(`
      CREATE TABLE material_dispatch_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dispatch_id UUID NOT NULL,
        product_id UUID NOT NULL,
        
        quantity DECIMAL(15,3) NOT NULL,
        
        -- Batch/Serial
        batch_number VARCHAR(100),
        serial_numbers TEXT[],
        
        -- Notes
        notes TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_material_dispatch_items_dispatch ON material_dispatch_items(dispatch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_material_dispatch_items_product ON material_dispatch_items(product_id);
    `);

    // ============================================
    // FOREIGN KEYS
    // ============================================

    // Warehouses
    await queryRunner.query(`
      ALTER TABLE warehouses
        ADD CONSTRAINT fk_warehouses_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        ADD CONSTRAINT fk_warehouses_manager FOREIGN KEY (warehouse_manager_id) REFERENCES users(id);
    `);

    // Inventory Stock
    await queryRunner.query(`
      ALTER TABLE inventory_stock
        ADD CONSTRAINT fk_inventory_stock_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        ADD CONSTRAINT fk_inventory_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_inventory_stock_product FOREIGN KEY (product_id) REFERENCES products(id);
    `);

    // Vendors
    await queryRunner.query(`
      ALTER TABLE vendors
        ADD CONSTRAINT fk_vendors_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
    `);

    // Project Vendors
    await queryRunner.query(`
      ALTER TABLE project_vendors
        ADD CONSTRAINT fk_project_vendors_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_project_vendors_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);
    `);

    // Purchase Orders
    await queryRunner.query(`
      ALTER TABLE purchase_orders
        ADD CONSTRAINT fk_purchase_orders_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        ADD CONSTRAINT fk_purchase_orders_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
        ADD CONSTRAINT fk_purchase_orders_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_purchase_orders_project FOREIGN KEY (project_id) REFERENCES projects(id),
        ADD CONSTRAINT fk_purchase_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id),
        ADD CONSTRAINT fk_purchase_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
    `);

    // Purchase Order Items
    await queryRunner.query(`
      ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_purchase_order_items_product FOREIGN KEY (product_id) REFERENCES products(id);
    `);

    // Inventory Transactions
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
        ADD CONSTRAINT fk_inventory_transactions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        ADD CONSTRAINT fk_inventory_transactions_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_inventory_transactions_product FOREIGN KEY (product_id) REFERENCES products(id),
        ADD CONSTRAINT fk_inventory_transactions_from_warehouse FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_inventory_transactions_to_warehouse FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_inventory_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id);
    `);

    // Stock Allocations
    await queryRunner.query(`
      ALTER TABLE stock_allocations
        ADD CONSTRAINT fk_stock_allocations_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        ADD CONSTRAINT fk_stock_allocations_project FOREIGN KEY (project_id) REFERENCES projects(id),
        ADD CONSTRAINT fk_stock_allocations_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_stock_allocations_product FOREIGN KEY (product_id) REFERENCES products(id);
    `);

    // Material Dispatches
    await queryRunner.query(`
      ALTER TABLE material_dispatches
        ADD CONSTRAINT fk_material_dispatches_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        ADD CONSTRAINT fk_material_dispatches_project FOREIGN KEY (project_id) REFERENCES projects(id),
        ADD CONSTRAINT fk_material_dispatches_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        ADD CONSTRAINT fk_material_dispatches_created_by FOREIGN KEY (created_by) REFERENCES users(id),
        ADD CONSTRAINT fk_material_dispatches_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
    `);

    // Material Dispatch Items
    await queryRunner.query(`
      ALTER TABLE material_dispatch_items
        ADD CONSTRAINT fk_material_dispatch_items_dispatch FOREIGN KEY (dispatch_id) REFERENCES material_dispatches(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_material_dispatch_items_product FOREIGN KEY (product_id) REFERENCES products(id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to respect foreign key constraints
    await queryRunner.query(`DROP TABLE IF EXISTS material_dispatch_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS material_dispatches CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_allocations CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_transactions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_orders CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_vendors CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS vendors CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_stock CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouses CASCADE;`);
  }
}
