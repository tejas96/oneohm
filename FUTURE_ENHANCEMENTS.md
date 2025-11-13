# 🔮 FUTURE ENHANCEMENTS & NON-ALIGNED FEATURES

> **Purpose:** Track features from the master schema that are not yet implemented but may be needed in the future.  
> **Status:** Reference document for future development phases  
> **Last Updated:** November 11, 2025

---

## 📋 TABLE OF CONTENTS

1. [Module 8: Projects - Missing Features](#module-8-projects---missing-features)
2. [Module 2: IAM System](#module-2-iam-system)
3. [Module 8: Approval Workflows](#module-8-approval-workflows)
4. [Module 9: Comments System](#module-9-comments-system)
5. [Module 11: Payments](#module-11-payments)
6. [Module 14: Document Management](#module-14-document-management)
7. [Module 15: Service & Maintenance](#module-15-service--maintenance)
8. [Module 16: Customer Feedback](#module-16-customer-feedback)
9. [Module 17: Loan & Finance](#module-17-loan--finance)
10. [Module 18: Compliance & Liaising](#module-18-compliance--liaising)
11. [Module 19: Audit & Logging](#module-19-audit--logging)

---

## 🔧 MODULE 8: PROJECTS - MISSING FEATURES

### **Current Status:** ✅ Basic Implementation (60% aligned)

### **What We Have:**
- ✅ `projects` table (basic)
- ✅ `project_milestones` table (with dependencies)
- ✅ `site_surveys` table (UNIQUE to our implementation)
- ✅ `project_materials` table (UNIQUE to our implementation)

### **Missing from Schema Module 10:**

#### **1. Milestone Templates** (Schema: lines 2125-2167)
```sql
CREATE TABLE milestone_templates (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    requires_payment BOOLEAN DEFAULT FALSE,
    default_payment_percentage DECIMAL(5,2),
    sequence_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    can_skip BOOLEAN DEFAULT FALSE,
    depends_on_milestone_codes TEXT[],
    estimated_duration_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    ...
)
```

**Use Case:** Pre-defined milestone templates for quick project setup  
**Priority:** MEDIUM  
**Effort:** 2-3 hours  

#### **2. Task Templates** (Schema: lines 2171-2217)
```sql
CREATE TABLE task_templates (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    milestone_template_id UUID REFERENCES milestone_templates(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    default_department VARCHAR(100),
    default_role_code VARCHAR(50),
    sequence_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    can_run_parallel BOOLEAN DEFAULT FALSE,
    depends_on_task_codes TEXT[],
    estimated_duration_hours INTEGER,
    checklist_template JSONB,
    ...
)
```

**Use Case:** Standardize task workflows across projects  
**Priority:** MEDIUM  
**Effort:** 2-3 hours  

#### **3. Project Tasks** (Schema: lines 2352-2427)
```sql
CREATE TABLE project_tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    milestone_id UUID NOT NULL,
    task_template_id UUID REFERENCES task_templates(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    assigned_to_user_id UUID,
    assigned_to_department VARCHAR(100),
    sequence_order INTEGER NOT NULL,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    depends_on_task_ids UUID[],
    can_run_parallel BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER DEFAULT 0,
    checklist JSONB,
    attachments JSONB,
    notes TEXT,
    -- Jira-style fields
    story_points INTEGER,
    labels TEXT[],
    estimated_hours DECIMAL(10,2),
    logged_hours DECIMAL(10,2) DEFAULT 0,
    watcher_user_ids UUID[],
    blocked_reason TEXT,
    ...
)
```

**Use Case:** Detailed task-level tracking within milestones (Jira-style)  
**Priority:** HIGH  
**Effort:** 4-5 hours  

#### **4. Task Time Logs** (Schema: lines 2562-2584)
```sql
CREATE TABLE task_time_logs (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    time_spent_hours DECIMAL(10,2) NOT NULL,
    work_date DATE NOT NULL,
    work_description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    ...
)
```

**Use Case:** Time tracking for tasks (billable hours)  
**Priority:** MEDIUM  
**Effort:** 2-3 hours  

#### **5. Task Activity Log** (Schema: lines 2591-2612)
```sql
CREATE TABLE task_activity_log (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    ...
)
```

**Use Case:** Detailed audit trail for task changes  
**Priority:** LOW  
**Effort:** 1-2 hours  

#### **6. Missing Fields in Projects Table**
```sql
-- Current: estimated_cost, actual_cost
-- Schema has:
contract_value DECIMAL(15,2) NOT NULL,
subsidy_amount DECIMAL(15,2) DEFAULT 0,
project_timeline_weeks INTEGER DEFAULT 4,
internal_notes TEXT,
site_coordinates POINT, -- vs our JSONB
```

**Priority:** LOW  
**Effort:** 1 hour (migration + entity update)  

---

## 🔐 MODULE 2: IAM SYSTEM

### **Current Status:** ❌ Not Implemented (Using Enum-based Roles)

### **Missing Tables:**

#### **1. Features** (Schema: lines 84-125)
```sql
CREATE TABLE features (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    parent_feature_id UUID REFERENCES features(id),
    feature_type VARCHAR(50) DEFAULT 'module',
    requires_license BOOLEAN DEFAULT FALSE,
    license_tier VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_system_feature BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    ...
)
```

**Use Case:** Dynamic feature access control  
**Priority:** LOW  
**Effort:** 6-8 hours (full IAM system)  

#### **2. Permissions** (Schema: lines 130-183)
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    feature_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    action VARCHAR(50) NOT NULL,
    scope VARCHAR(50) DEFAULT 'all',
    conditions JSONB,
    permission_level VARCHAR(50) DEFAULT 'standard',
    show_in_menu BOOLEAN DEFAULT TRUE,
    menu_label VARCHAR(255),
    depends_on_permission_ids UUID[],
    is_active BOOLEAN DEFAULT TRUE,
    ...
)
```

#### **3. Permission Conditions** (Schema: lines 187-213)
#### **4. Roles** (Schema: lines 217-244)
#### **5. Role Feature Access** (Schema: lines 247-274)
#### **6. Role Permissions** (Schema: lines 279-291)
#### **7. Organization Feature Config** (Schema: lines 296-324)

**Total Priority:** LOW (current enum-based system works)  
**Total Effort:** 10-12 hours  
**When Needed:** Multi-tenancy with custom permissions per organization  

---

## ✅ MODULE 8: APPROVAL WORKFLOWS

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **1. Approval Workflows** (Schema: lines 891-920)
```sql
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    description TEXT,
    approval_levels JSONB NOT NULL,
    trigger_conditions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    ...
)
```

#### **2. Approval Requests** (Schema: lines 925-963)
#### **3. Approval Actions** (Schema: lines 968-991)

**Use Case:** Multi-level approvals for quotes, POs, expenses  
**Priority:** MEDIUM  
**Effort:** 5-6 hours  
**Dependencies:** None  

---

## 💬 MODULE 9: COMMENTS SYSTEM

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **Comments** (Schema: lines 1004-1041)
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID, -- Threading support
    mentioned_user_ids UUID[],
    attachments JSONB,
    is_internal BOOLEAN DEFAULT TRUE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    ...
)
```

**Use Case:** Comments on projects, quotes, tasks (like Jira comments)  
**Priority:** MEDIUM  
**Effort:** 3-4 hours  
**Features:** Threading, mentions, attachments  

---

## 💰 MODULE 11: PAYMENTS

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **Payments** (Schema: lines 2439-2491)
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    milestone_id UUID REFERENCES project_milestones(id),
    customer_id UUID NOT NULL,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    expected_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    transaction_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by UUID,
    notes TEXT,
    ...
)
```

**Use Case:** Payment tracking, milestone-based payments, reconciliation  
**Priority:** HIGH  
**Effort:** 4-5 hours  
**Business Value:** Critical for revenue tracking  

---

## 📄 MODULE 14: DOCUMENT MANAGEMENT

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **Documents** (Schema: lines 1487-1555)
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    document_number VARCHAR(50) UNIQUE NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    project_id UUID REFERENCES projects(id),
    customer_id UUID REFERENCES customers(id),
    quote_id UUID REFERENCES quotes(id),
    payment_id UUID REFERENCES payments(id),
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT TRUE,
    parent_document_id UUID,
    -- Digital Signature
    is_signed BOOLEAN DEFAULT FALSE,
    signed_by UUID,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_data TEXT,
    -- OTP Verification
    is_otp_verified BOOLEAN DEFAULT FALSE,
    otp_verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB,
    ...
)
```

**Use Case:** File management, e-signatures, version control  
**Priority:** MEDIUM  
**Effort:** 5-6 hours  
**Features:** S3 integration, e-signatures, versioning  

---

## 🔧 MODULE 15: SERVICE & MAINTENANCE

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **1. Project Maintenance Configs** (Schema: lines 1567-1600)
```sql
CREATE TABLE project_maintenance_configs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    is_maintenance_enabled BOOLEAN DEFAULT TRUE,
    maintenance_years INTEGER NOT NULL,
    intervals JSONB NOT NULL,
    project_completion_date DATE,
    last_maintenance_date DATE,
    next_maintenance_due_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    ...
)
```

#### **2. Maintenance Tasks** (Schema: lines 1604-1656)
#### **3. Service Requests** (Schema: lines 1660-1721)

**Use Case:** Post-installation maintenance tracking, service requests  
**Priority:** MEDIUM  
**Effort:** 5-6 hours  
**Business Value:** Customer retention, AMC revenue  

---

## ⭐ MODULE 16: CUSTOMER FEEDBACK

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **Customer Feedback** (Schema: lines 1730-1774)
```sql
CREATE TABLE customer_feedback (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
    nps_category VARCHAR(20),
    department_ratings JSONB NOT NULL,
    general_comments TEXT,
    improvement_suggestions TEXT,
    would_recommend BOOLEAN,
    feedback_method VARCHAR(50),
    is_published BOOLEAN DEFAULT FALSE,
    company_response TEXT,
    responded_by UUID,
    responded_at TIMESTAMP WITH TIME ZONE,
    ...
)
```

**Use Case:** NPS tracking, testimonials, improvement insights  
**Priority:** LOW  
**Effort:** 3-4 hours  

---

## 🏦 MODULE 17: LOAN & FINANCE

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **1. Loan Applications** (Schema: lines 1783-1846)
```sql
CREATE TABLE loan_applications (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    loan_amount DECIMAL(15,2) NOT NULL,
    loan_tenure_months INTEGER NOT NULL,
    interest_rate DECIMAL(5,2),
    lender_name VARCHAR(255),
    jan_samarth_application_id VARCHAR(100),
    jan_samarth_submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'initiated',
    site_visit_scheduled_date DATE,
    approved_amount DECIMAL(15,2),
    disbursement_date DATE,
    ...
)
```

#### **2. Loan Documents** (Schema: lines 1850-1867)

**Use Case:** Solar loan management, Jan Samarth portal integration  
**Priority:** MEDIUM  
**Effort:** 4-5 hours  
**Business Value:** Facilitate customer financing  

---

## 🏛️ MODULE 18: COMPLIANCE & LIAISING

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **1. Compliance Applications** (Schema: lines 1876-1922)
```sql
CREATE TABLE compliance_applications (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    application_type VARCHAR(100) NOT NULL,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    authority_name VARCHAR(255),
    authority_reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_document_path TEXT,
    ...
)
```

#### **2. Inspections** (Schema: lines 1926-1973)
#### **3. Subsidy Applications** (Schema: lines 1977-2028)

**Use Case:** Government approvals, subsidies, inspections  
**Priority:** MEDIUM  
**Effort:** 6-7 hours  
**Business Value:** Regulatory compliance  

---

## 📊 MODULE 19: AUDIT & LOGGING

### **Current Status:** ❌ Not Implemented

### **Missing Tables:**

#### **1. Audit Logs** (Schema: lines 2039-2071)
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    ...
)
```

#### **2. Notifications** (Schema: lines 2074-2117)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_sent_email BOOLEAN DEFAULT FALSE,
    is_sent_sms BOOLEAN DEFAULT FALSE,
    is_sent_push BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',
    metadata JSONB,
    ...
)
```

**Use Case:** System audit trail, push notifications, email alerts  
**Priority:** MEDIUM  
**Effort:** 4-5 hours  
**Business Value:** Compliance, user engagement  

---

## 📈 PRIORITY MATRIX

### **HIGH Priority (Should Implement Soon)**
1. ✅ **Inventory Management** - IN PROGRESS
2. 💰 **Payments Module** - Revenue tracking critical
3. 📋 **Project Tasks** - Better project management

### **MEDIUM Priority (Implement When Needed)**
1. ✅ **Approval Workflows** - Multi-level approvals
2. 📄 **Documents** - File management & e-signatures
3. 🔧 **Service & Maintenance** - Post-installation support
4. 💬 **Comments System** - Collaboration
5. 🏦 **Loan & Finance** - Customer financing
6. 🏛️ **Compliance** - Government approvals
7. 📊 **Notifications** - User engagement

### **LOW Priority (Future Enhancements)**
1. 🔐 **IAM System** - When multi-tenancy needs custom permissions
2. ⭐ **Customer Feedback** - NPS tracking
3. 📊 **Audit Logs** - Detailed audit trail
4. 📋 **Milestone/Task Templates** - Process standardization

---

## 🔄 MIGRATION STRATEGY

When implementing these features:

1. **Check Schema**: Reference exact table structure from `schema` file
2. **Check AI_FEEDBACK.md**: Follow documented patterns
3. **Check .cursorrules**: Follow all 40 rules
4. **Phase Approach**: Implement in phases (DB → Entity → DTO → Repo → Service → Controller)
5. **Test**: Ensure migration runs, typecheck passes, lint passes
6. **Document**: Update this file with status

---

## 📝 NOTES

- **Schema File**: Reference for all table structures and relationships
- **Simplification Strategy**: We implement core features first, add advanced features later
- **No Rush**: Better to have working simple features than broken complex ones
- **Business First**: Prioritize features that deliver business value

---

**Last Review:** Module 8 (Projects) completed - 60% schema alignment  
**Next Target:** Module 6 (Inventory) - 100% schema alignment  
**Future Focus:** Fill gaps based on user feedback and business needs  

---

_This document will be updated as features are implemented or priorities change._

