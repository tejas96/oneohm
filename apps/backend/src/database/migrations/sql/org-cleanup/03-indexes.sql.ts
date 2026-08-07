/**
 * Index rebuilds after organization_id was dropped.
 *
 * Of the 90 indexes that mentioned the column: 30 unique and 60 non-unique.
 * 29 uniques are rebuilt (the 30th belonged to organization_settings, which is
 * dropped), along with 29 non-uniques. The remaining 31 non-uniques are
 * deliberately NOT rebuilt — 24 indexed nothing but the org column itself, and
 * 7 became prefixes of a unique index rebuilt here.
 */
export const ORG_CLEANUP_INDEXES: string[] = [
  // ---- unique ----
  `CREATE UNIQUE INDEX uq_customer_profiles_user ON customer_profiles (user_id)`,
  `CREATE UNIQUE INDEX uq_customer_profiles_email ON customer_profiles (lower(email)) WHERE deleted_at IS NULL AND email IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_customer_profiles_phone ON customer_profiles (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_employee_profiles_user ON employee_profiles (user_id)`,
  `CREATE UNIQUE INDEX uq_employee_profiles_emp_id ON employee_profiles (employee_id)`,
  `CREATE UNIQUE INDEX uq_employee_profiles_company_code ON employee_profiles (company_code) WHERE company_code IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_numbering_sequences_key ON numbering_sequences (sequence_key)`,
  `CREATE UNIQUE INDEX uq_ledger_entries_entry_no ON ledger_entries (entry_no)`,
  `CREATE UNIQUE INDEX uq_payments_number_active ON payments (payment_number) WHERE deleted_at IS NULL`,
  `CREATE UNIQUE INDEX uq_project_expenses_number_active ON project_expenses (expense_number) WHERE deleted_at IS NULL`,
  `CREATE UNIQUE INDEX uq_purchase_orders_po_number ON purchase_orders (po_number)`,
  `CREATE UNIQUE INDEX uq_material_dispatches_dispatch_number ON material_dispatches (dispatch_number)`,
  `CREATE UNIQUE INDEX uq_brands_name ON brands (name)`,
  `CREATE UNIQUE INDEX uq_products_code ON products (code)`,
  `CREATE UNIQUE INDEX uq_product_types_code ON product_types (code)`,
  `CREATE UNIQUE INDEX uq_vendors_code ON vendors (code)`,
  `CREATE UNIQUE INDEX uq_warehouses_code ON warehouses (code)`,
  `CREATE UNIQUE INDEX uq_roles_code ON roles (code)`,
  `CREATE UNIQUE INDEX uq_approval_templates_code ON approval_templates (code, deleted_at)`,
  `CREATE UNIQUE INDEX uq_task_templates_code ON workflow_steps (code, deleted_at)`,
  `CREATE UNIQUE INDEX uq_workflow_steps_change_request_type ON workflow_steps (change_request_type) WHERE deleted_at IS NULL AND change_request_type IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_integrations_provider_category ON integrations (provider, category)`,
  `CREATE UNIQUE INDEX uq_ip_size_tier ON installation_pricing (min_system_size_kw, max_system_size_kw)`,
  `CREATE UNIQUE INDEX uq_subsidy_config_scheme_code ON subsidy_configurations (scheme_code) WHERE scheme_code IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_saved_views_owner_name ON saved_views (user_id, resource, name)`,
  `CREATE UNIQUE INDEX uq_user_roles_user_role_id ON user_roles (user_id, role_id)`,
  `CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles (user_id, role) WHERE role IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_products_active_structure_type ON products (product_type_id, ((specifications ->> 'structure_type'))) WHERE status = 'active' AND deleted_at IS NULL AND (specifications ->> 'structure_type') IS NOT NULL AND (specifications ->> 'structure_type') <> ''`,

  // "At most one active quote configuration" was UNIQUE (organization_id) WHERE
  // is_active. A unique index needs at least one column, so the single-tenant
  // equivalent is a unique index on a constant expression.
  `CREATE UNIQUE INDEX uq_quote_config_active ON quote_configurations ((TRUE)) WHERE is_active = TRUE`,

  // ---- non-unique ----
  `CREATE INDEX idx_customer_profiles_status ON customer_profiles (status, deleted_at)`,
  `CREATE INDEX idx_customer_profiles_assignee ON customer_profiles (assignee_id) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_profiles_group ON customer_profiles (group_code) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_properties_temperature ON customer_properties (lead_temperature, deleted_at)`,
  `CREATE INDEX idx_customer_properties_site_status ON customer_properties (site_status) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_properties_customer ON customer_properties (customer_id)`,
  `CREATE INDEX idx_customer_properties_filter_lookup ON customer_properties (customer_id, property_type, connection_type, status, lead_temperature) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_properties_status ON customer_properties (status, deleted_at)`,
  `CREATE INDEX idx_documents_property ON documents (property_id, deleted_at)`,
  `CREATE INDEX idx_documents_entity ON documents (entity_type, deleted_at)`,
  `CREATE INDEX idx_commissions_employee ON employee_commissions (employee_id, status)`,
  `CREATE INDEX idx_employee_profiles_kind_status ON employee_profiles (profile_kind, status, deleted_at)`,
  `CREATE INDEX idx_employee_profiles_status ON employee_profiles (status, deleted_at)`,
  `CREATE INDEX idx_followups_status ON followups (status, deleted_at)`,
  `CREATE INDEX idx_installation_pricing_active ON installation_pricing (is_active)`,
  `CREATE INDEX idx_ip_active_size ON installation_pricing (is_active, min_system_size_kw DESC)`,
  `CREATE INDEX idx_integrations_active ON integrations (is_active)`,
  `CREATE INDEX idx_inventory_stock_warehouse ON inventory_stock (warehouse_id)`,
  `CREATE INDEX idx_inventory_stock_product ON inventory_stock (product_id)`,
  `CREATE INDEX idx_inventory_transactions_date ON inventory_transactions (transaction_date DESC)`,
  `CREATE INDEX idx_ledger_entries_direction_value_date ON ledger_entries (direction, value_date)`,
  `CREATE INDEX idx_material_dispatches_status ON material_dispatches (status)`,
  `CREATE INDEX idx_products_status ON products (status, deleted_at)`,
  `CREATE INDEX idx_purchase_orders_status ON purchase_orders (status)`,
  `CREATE INDEX idx_purchase_orders_vendor ON purchase_orders (vendor_id)`,
  `CREATE INDEX idx_security_events_type_created ON security_events (event_type, created_at)`,
  `CREATE INDEX idx_stock_allocations_status ON stock_allocations (status)`,
  `CREATE INDEX idx_subsidy_config_project_active ON subsidy_configurations (project_type, is_active)`,
  `CREATE INDEX idx_user_roles_role ON user_roles (role_id) WHERE role_id IS NOT NULL`,
];
