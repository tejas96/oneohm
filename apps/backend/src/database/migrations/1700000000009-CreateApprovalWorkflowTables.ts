import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Create Approval Workflow Tables
 * Module: Module 7 - Approval Workflows
 * Tables: approval_templates, approval_stages, approval_requests, approval_history
 * Purpose: Multi-level approval workflows for quotes, POs, projects, etc.
 */
export class CreateApprovalWorkflowTables1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // TABLE: approval_templates
    // ============================================
    await queryRunner.query(`
      CREATE TABLE approval_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        
        -- Template Info
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Workflow Type: purchase_order, quote, project, expense, etc.
        workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN (
          'purchase_order', 'quote', 'project', 'expense', 'customer_credit'
        )),
        
        -- Trigger Conditions (JSONB for flexibility)
        -- Example: { "minAmount": 50000, "maxAmount": 200000, "requiresFinanceApproval": true }
        trigger_conditions JSONB,
        
        -- Auto-approval rules
        auto_approval_enabled BOOLEAN DEFAULT FALSE,
        auto_approval_conditions JSONB,
        
        -- Escalation
        escalation_enabled BOOLEAN DEFAULT FALSE,
        escalation_hours INTEGER,
        
        -- Notifications
        notify_on_request BOOLEAN DEFAULT TRUE,
        notify_on_approval BOOLEAN DEFAULT TRUE,
        notify_on_rejection BOOLEAN DEFAULT TRUE,
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        -- Constraints
        CONSTRAINT uq_approval_templates_org_code UNIQUE (organization_id, code, deleted_at)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_templates_organization ON approval_templates(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_templates_workflow_type ON approval_templates(workflow_type) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_templates_is_active ON approval_templates(is_active) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // TABLE: approval_stages
    // ============================================
    await queryRunner.query(`
      CREATE TABLE approval_stages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL,
        
        -- Stage Info
        name VARCHAR(255) NOT NULL,
        description TEXT,
        stage_order INTEGER NOT NULL,
        
        -- Approver Configuration
        -- Type: role_based, user_based, dynamic
        approver_type VARCHAR(50) NOT NULL CHECK (approver_type IN (
          'role_based', 'user_based', 'dynamic', 'any_user'
        )),
        
        -- For role_based: ["MANAGER", "ADMIN"]
        approver_roles VARCHAR(50)[],
        
        -- For user_based: specific user IDs
        approver_user_ids UUID[],
        
        -- Dynamic rules (JSONB)
        -- Example: { "field": "createdBy.managerId", "condition": "notNull" }
        dynamic_approver_rules JSONB,
        
        -- Approval Requirements
        -- Type: any, all, majority, count
        approval_requirement_type VARCHAR(50) DEFAULT 'any' CHECK (approval_requirement_type IN (
          'any', 'all', 'majority', 'count'
        )),
        
        -- Required count (for count type)
        required_approvals_count INTEGER DEFAULT 1,
        
        -- Stage Behavior
        is_mandatory BOOLEAN DEFAULT TRUE,
        can_skip BOOLEAN DEFAULT FALSE,
        skip_conditions JSONB,
        
        -- Parallel/Sequential
        allow_parallel_approval BOOLEAN DEFAULT FALSE,
        
        -- Timeout
        timeout_hours INTEGER,
        auto_action_on_timeout VARCHAR(50) CHECK (auto_action_on_timeout IN ('approve', 'reject', 'escalate')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_stages_template ON approval_stages(template_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_stages_stage_order ON approval_stages(template_id, stage_order);
    `);

    // ============================================
    // TABLE: approval_requests
    // ============================================
    await queryRunner.query(`
      CREATE TABLE approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        template_id UUID NOT NULL,
        
        -- Reference to entity being approved
        reference_type VARCHAR(50) NOT NULL,
        reference_id UUID NOT NULL,
        
        -- Request Info
        request_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        
        -- Amount/Value (if applicable)
        amount DECIMAL(15,2),
        
        -- Current Stage
        current_stage_id UUID,
        current_stage_order INTEGER DEFAULT 1,
        
        -- Status: pending, in_progress, approved, rejected, cancelled, expired
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
          'pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'expired'
        )),
        
        -- Priority: low, normal, high, urgent
        priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN (
          'low', 'normal', 'high', 'urgent'
        )),
        
        -- Timestamps
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        
        -- Requestor
        requested_by UUID NOT NULL,
        
        -- Final Result
        final_status VARCHAR(50) CHECK (final_status IN ('approved', 'rejected', 'cancelled', 'expired')),
        final_comment TEXT,
        final_approved_by UUID,
        final_rejected_by UUID,
        
        -- Metadata (JSONB for extensibility)
        metadata JSONB,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_requests_organization ON approval_requests(organization_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_requests_template ON approval_requests(template_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_requests_reference ON approval_requests(reference_type, reference_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_requests_status ON approval_requests(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_requests_current_stage ON approval_requests(current_stage_id);
    `);

    // ============================================
    // TABLE: approval_history
    // ============================================
    await queryRunner.query(`
      CREATE TABLE approval_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        approval_request_id UUID NOT NULL,
        stage_id UUID,
        
        -- Action: submitted, assigned, approved, rejected, commented, reassigned, escalated, cancelled
        action VARCHAR(50) NOT NULL CHECK (action IN (
          'submitted', 'assigned', 'approved', 'rejected', 'commented', 'reassigned', 'escalated', 'cancelled', 'auto_approved'
        )),
        
        -- Decision: approved, rejected, pending
        decision VARCHAR(50) CHECK (decision IN ('approved', 'rejected', 'pending')),
        
        -- Comment/Notes
        comment TEXT,
        
        -- Actor
        acted_by UUID NOT NULL,
        acted_by_role VARCHAR(50),
        
        -- Delegation
        delegated_from UUID,
        
        -- Timestamps
        acted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Metadata (e.g., IP address, device info)
        metadata JSONB,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_history_request ON approval_history(approval_request_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_history_stage ON approval_history(stage_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_history_acted_by ON approval_history(acted_by);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_history_action ON approval_history(action);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_approval_history_acted_at ON approval_history(acted_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS approval_history CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_requests CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_stages CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_templates CASCADE;`);
  }
}
