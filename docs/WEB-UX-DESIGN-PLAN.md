# OneOhm EPC - Web UX Design Plan

> **Document Created:** January 27, 2026  
> **Version:** 1.0  
> **Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Application Scope Analysis](#application-scope-analysis)
3. [User Roles & Access Matrix](#user-roles--access-matrix)
4. [Design System Proposal](#design-system-proposal)
5. [Information Architecture](#information-architecture)
6. [Sidebar Navigation Design](#sidebar-navigation-design)
7. [Module-by-Module UX Plan](#module-by-module-ux-plan)
8. [UX Innovation Highlights](#ux-innovation-highlights)
9. [Technical Implementation Approach](#technical-implementation-approach)
10. [Implementation Phases](#implementation-phases)
11. [Gap Analysis](#gap-analysis)

---

## Executive Summary

OneOhm is a comprehensive **Solar EPC (Engineering, Procurement, Construction)** platform. The web application serves as the **command center** for operations, while the mobile app handles field activities.

### Current State Assessment

| Aspect          | Status                                   |
| --------------- | ---------------------------------------- |
| Backend Modules | 20+ modules fully developed              |
| Mobile UX       | 93 HTML mockups complete                 |
| Web UX          | 58 HTML mockups (partial)                |
| Design System   | Basic Tailwind setup with orange primary |
| User Roles      | 8 distinct roles identified              |

### Technology Stack

- **Backend:** NestJS with PostgreSQL
- **Web Frontend:** Next.js (planned)
- **Mobile:** React Native
- **UX Prototypes:** Static HTML + Tailwind CSS
- **Monorepo:** NX Workspaces

---

## Application Scope Analysis

### Backend Modules (20+)

| Module                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `customers`           | Customer management, properties, site visits      |
| `iam`                 | Identity & Access Management (roles, permissions) |
| `quotes`              | Quote generation, versions, pricing               |
| `projects`            | Project management, milestones, tasks             |
| `inventory`           | Warehouses, vendors, purchase orders, stock       |
| `payments`            | Payment management                                |
| `approvals`           | Approval workflows                                |
| `documents`           | Document management                               |
| `employees`           | Employee management                               |
| `master-data`         | Configuration data                                |
| `integrations`        | External service integrations                     |
| `loan-finance`        | Loan financing                                    |
| `service-maintenance` | AMC and service                                   |
| `resellers`           | Reseller management                               |
| `audit`               | Audit logging                                     |
| `compliance`          | Compliance tracking                               |
| `customer-feedback`   | Feedback collection                               |
| `organizations`       | Multi-org support                                 |
| `storage`             | File storage                                      |
| `security-events`     | Security monitoring                               |

### Existing Web UX Screens (58 files)

```
apps/ux/web/
├── admin/           (14 screens)
│   ├── admin-dashboard.html
│   ├── admin-leads.html
│   ├── admin-projects.html
│   ├── admin-quotes.html
│   ├── admin-payments.html
│   ├── admin-users.html
│   ├── admin-inventory.html
│   ├── admin-reports.html
│   ├── activity-logs.html
│   ├── customer-registration.html
│   ├── quote-builder.html
│   ├── service-management.html
│   ├── system-settings.html
│   └── vendor-management.html
├── analytics/       (8 screens)
│   ├── analytics-dashboard.html
│   ├── custom-reports.html
│   ├── financial-analytics.html
│   ├── performance-metrics.html
│   ├── predictive-analytics.html
│   ├── project-analytics.html
│   ├── sales-analytics.html
│   └── trend-analysis.html
├── auth/            (4 screens)
│   ├── login.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   └── two-factor.html
├── finance/         (3 screens)
│   ├── financial-reports.html
│   ├── gst-reports.html
│   └── invoice-management.html
├── inventory/       (6 screens)
│   ├── bom-builder.html
│   ├── material-master.html
│   ├── material-requisition.html
│   ├── mrp-planning.html
│   ├── stock-dashboard.html
│   └── stock-movement.html
├── project/         (3 screens)
│   ├── project-gantt.html
│   ├── quality-control.html
│   └── resource-management.html
├── project-mgmt/    (8 screens)
│   ├── advanced-gantt.html
│   ├── change-requests.html
│   ├── critical-path.html
│   ├── multi-project-dashboard.html
│   ├── project-comparison.html
│   ├── project-portfolio.html
│   ├── resource-optimization.html
│   └── risk-management.html
├── sales/           (3 screens)
│   ├── customer-360.html
│   ├── proposals.html
│   └── sales-pipeline.html
├── vendor/          (4 screens)
│   ├── purchase-orders.html
│   ├── vendor-database.html
│   ├── vendor-payments.html
│   └── vendor-performance.html
└── workflow/        (5 screens)
    ├── approval-history.html
    ├── approval-queue.html
    ├── pending-approvals.html
    ├── workflow-designer.html
    └── workflow-templates.html
```

---

## User Roles & Access Matrix

### Identified User Roles

| Role                   | Primary Responsibility  | Platform               |
| ---------------------- | ----------------------- | ---------------------- |
| **Super Admin**        | Full system management  | Web                    |
| **Admin**              | Operations management   | Web                    |
| **Sales Manager**      | Sales team oversight    | Web                    |
| **Sales Person**       | Direct sales activities | Web + Mobile           |
| **Telecaller**         | Telemarketing           | Web                    |
| **Field Worker**       | Field operations        | Mobile (primary)       |
| **Execution Engineer** | Project execution       | Mobile + Web           |
| **Liaison**            | External coordination   | Mobile + Web           |
| **Finance Manager**    | Financial oversight     | Web                    |
| **Project Manager**    | Project oversight       | Web                    |
| **Inventory Manager**  | Stock management        | Web                    |
| **Customer**           | Self-service            | Mobile + Web (limited) |

### Web Access Matrix

| Module      | Admin   | Sales Mgr | Finance    | Project Mgr | Inventory Mgr |
| ----------- | ------- | --------- | ---------- | ----------- | ------------- |
| Dashboard   | ✅ Full | ✅ Sales  | ✅ Finance | ✅ Projects | ✅ Inventory  |
| CRM/Leads   | ✅      | ✅        | ❌         | ❌          | ❌            |
| Customers   | ✅      | ✅        | ✅ View    | ✅ View     | ❌            |
| Quotes      | ✅      | ✅        | ✅ View    | ✅          | ❌            |
| Projects    | ✅      | ❌        | ❌         | ✅          | ❌            |
| Inventory   | ✅      | ❌        | ❌         | ✅ View     | ✅            |
| Finance     | ✅      | ❌        | ✅         | ❌          | ❌            |
| Vendors     | ✅      | ❌        | ✅         | ✅          | ✅            |
| Approvals   | ✅      | ✅        | ✅         | ✅          | ✅            |
| Analytics   | ✅      | ✅ Sales  | ✅ Finance | ✅ Projects | ✅ Inventory  |
| Users/Roles | ✅      | ❌        | ❌         | ❌          | ❌            |
| Settings    | ✅      | ❌        | ❌         | ❌          | ❌            |

---

## Design System Proposal

### Current Design

- **Font:** Inter
- **Primary Color:** #F97316 (Orange)
- **Style:** Basic Tailwind with gray backgrounds

### Proposed Enhancements

#### Typography

```css
/* Primary Font - Modern geometric sans-serif */
--font-primary: 'DM Sans', sans-serif;

/* Secondary Font - For data/numbers */
--font-mono: 'JetBrains Mono', monospace;

/* Optional accent for headings */
--font-display: 'Playfair Display', serif;
```

#### Color Palette - "Solar Energy" Theme

```css
:root {
  /* Primary - Sunset Orange (existing) */
  --primary-50: #fff7ed;
  --primary-100: #ffedd5;
  --primary-200: #fed7aa;
  --primary-300: #fdba74;
  --primary-400: #fb923c;
  --primary-500: #f97316;
  --primary-600: #ea580c;
  --primary-700: #c2410c;
  --primary-800: #9a3412;
  --primary-900: #7c2d12;

  /* Secondary - Solar Gold */
  --gold-400: #fbbf24;
  --gold-500: #f59e0b;
  --gold-600: #d97706;

  /* Accent - Electric Teal */
  --teal-400: #2dd4bf;
  --teal-500: #14b8a6;
  --teal-600: #0d9488;

  /* Neutral - Slate (warmer than gray) */
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;

  /* Semantic Colors */
  --success: #22c55e;
  --success-light: #dcfce7;
  --warning: #eab308;
  --warning-light: #fef9c3;
  --error: #ef4444;
  --error-light: #fee2e2;
  --info: #3b82f6;
  --info-light: #dbeafe;
}
```

#### Visual Effects

```css
/* Glassmorphism for cards */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Gradient backgrounds */
.gradient-warm {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
}

/* Shadow system */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

---

## Information Architecture

### Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ONEOHM                          🔔 📧   [Search]   [Avatar]│
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│ 🏠 Home    │  ┌──────────────────────────────────────────┐  │
│            │  │          CONTEXTUAL CONTENT               │  │
│ 💼 CRM     │  │                                          │  │
│  ├ Leads   │  │  Dashboard / Module Content              │  │
│  ├ Customers│ │                                          │  │
│  └ Pipeline │ │                                          │  │
│            │  └──────────────────────────────────────────┘  │
│ 📝 Quotes  │                                                │
│            │                                                │
│ 🔧 Projects│                                                │
│  ├ Active  │                                                │
│  ├ Planning│                                                │
│  └ Completed│                                               │
│            │                                                │
│ 📦 Inventory│                                               │
│            │                                                │
│ 💰 Finance │                                                │
│            │                                                │
│ 📊 Analytics│                                               │
│            │                                                │
│ ⚙️ Settings│                                                │
└────────────┴────────────────────────────────────────────────┘
```

---

## Sidebar Navigation Design

### Current State Issues

The existing sidebar has only **8 flat items**:

- Dashboard
- Leads
- Projects
- Quotes
- Payments
- Users & Teams
- Inventory
- Reports

### Gap Analysis

| What's Present | What's Missing            |
| -------------- | ------------------------- |
| Dashboard      | ❌ Customer Management    |
| Leads          | ❌ Sales Pipeline         |
| Projects       | ❌ Project Kanban/Gantt   |
| Quotes         | ❌ Quote Builder          |
| Payments       | ❌ Invoices/GST           |
| Users & Teams  | ❌ Roles & Permissions    |
| Inventory      | ❌ Vendors/PO             |
| Reports        | ❌ Analytics (8 screens!) |
| —              | ❌ Approvals/Workflow     |
| —              | ❌ Service & AMC          |
| —              | ❌ Documents              |
| —              | ❌ Resellers              |
| —              | ❌ Settings/Config        |
| —              | ❌ Notifications          |
| —              | ❌ Help/Support           |

### Proposed Navigation Structure

```
ONEOHM SIDEBAR NAVIGATION
═══════════════════════════

🔍 GLOBAL SEARCH (⌘K)

━━━ OVERVIEW ━━━
├── 🏠 Dashboard
├── 🔔 Notifications (badge)
└── 📌 Favorites (user-pinned)

━━━ SALES & CRM ━━━
├── 👥 Leads
│   ├── All Leads
│   ├── My Leads
│   ├── Hot Leads
│   └── Follow-ups (badge)
├── 🏢 Customers
│   ├── Directory
│   ├── Customer 360
│   └── Properties
├── 📊 Sales Pipeline
│   ├── Kanban View
│   ├── List View
│   └── Forecast
└── 📑 Proposals

━━━ QUOTATIONS ━━━
├── 📝 All Quotes
├── ✨ Quote Builder
├── 📋 Templates
└── 📊 Quote Analytics

━━━ PROJECT MANAGEMENT ━━━
├── 📁 Projects
│   ├── All Projects
│   ├── Active
│   ├── Planning
│   └── Completed
├── 📅 Calendar
├── 📊 Gantt Chart
├── 🔲 Kanban Board
├── 👷 Resources
│   ├── Team Allocation
│   └── Workload
├── 📋 Tasks
├── ✅ Milestones
├── 🔍 Site Surveys
└── 📸 Documentation

━━━ INVENTORY & SUPPLY ━━━
├── 📦 Stock Dashboard
├── 🏭 Warehouses
├── 📋 Materials
│   ├── Master List
│   ├── BOM Builder
│   └── MRP Planning
├── 🛒 Purchase Orders
│   ├── Create PO
│   ├── Pending (badge)
│   └── History
├── 📥 Goods Receipt
└── 🏪 Vendors
    ├── Directory
    ├── Performance
    └── Payments

━━━ FINANCE & BILLING ━━━
├── 💰 Payments
│   ├── Collections
│   ├── Pending (badge + amount)
│   └── History
├── 🧾 Invoices
│   ├── Create Invoice
│   ├── Outstanding
│   └── All Invoices
├── 📊 GST Reports
├── 💳 Loan/Finance
└── 📈 Financial Reports

━━━ OPERATIONS ━━━
├── ✅ Approvals (badge)
│   ├── Pending
│   ├── My Requests
│   └── History
├── 🔧 Service & AMC
│   ├── Service Requests
│   ├── AMC Contracts
│   └── Scheduled Visits
├── 📄 Documents
│   ├── All Documents
│   ├── Templates
│   └── Upload
├── 🤝 Resellers
│   ├── Directory
│   ├── Performance
│   └── Commissions
└── ⚡ Workflow Designer

━━━ ANALYTICS & INSIGHTS ━━━
├── 📊 Overview Dashboard
├── 💼 Sales Analytics
├── 🔧 Project Analytics
├── 💰 Financial Analytics
├── 📈 Trend Analysis
├── 🎯 Predictive Insights
└── 📑 Custom Reports

━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ ADMINISTRATION ━━━
├── 👤 User Management
│   ├── All Users
│   ├── Invite User
│   └── Teams
├── 🔐 Roles & Permissions
├── 🏢 Organization
│   ├── Company Profile
│   ├── Branches
│   └── Departments
├── 🔗 Integrations
│   ├── WhatsApp
│   ├── SMS Gateway
│   └── Payment Gateway
├── 📝 Audit Logs
└── ⚙️ System Settings
    ├── General
    ├── Notifications
    ├── Master Data
    └── Backup

━━━━━━━━━━━━━━━━━━━━━━━━━

❓ Help & Support
📖 Documentation

━━━ USER PROFILE ━━━
┌─────────────────────┐
│ 👤 Super Admin      │
│ admin@oneohm.com    │
│ [Profile] [Logout]  │
└─────────────────────┘
```

### Navigation Design Features

#### 1. Visual Hierarchy

- Section headers: Uppercase, smaller, muted color
- Primary items: Normal weight, full opacity
- Sub-items: Slightly indented, smaller
- Active state: Accent color + left border
- Hover: Subtle background change

#### 2. Badge System

- 🔴 Red badge: Urgent items (overdue, pending approvals)
- 🟢 Green badge: New items
- 🔵 Blue badge: Information
- 💰 Value badge: Show pending amounts (₹2.5L)

#### 3. Quick Actions Footer

```
┌─────────────────────────────────┐
│ ⚡ Quick Actions                │
│ [+ Lead] [+ Quote] [+ Project] │
└─────────────────────────────────┘
```

#### 4. Collapse/Expand Toggle

- Full sidebar with text labels
- Collapsed state with icons only
- Tooltips on hover in collapsed state

### Role-Based Navigation Visibility

| Menu Section | Admin | Sales | Finance | Project Mgr | Field Worker |
| ------------ | ----- | ----- | ------- | ----------- | ------------ |
| Dashboard    | ✅    | ✅    | ✅      | ✅          | ✅           |
| CRM          | ✅    | ✅    | ❌      | ❌          | ✅ (limited) |
| Quotes       | ✅    | ✅    | ❌      | ✅          | ✅           |
| Projects     | ✅    | ❌    | ❌      | ✅          | ✅           |
| Inventory    | ✅    | ❌    | ❌      | ✅          | ❌           |
| Finance      | ✅    | ❌    | ✅      | ❌          | ❌           |
| Approvals    | ✅    | ✅    | ✅      | ✅          | ❌           |
| Analytics    | ✅    | ✅    | ✅      | ✅          | ❌           |
| Admin        | ✅    | ❌    | ❌      | ❌          | ❌           |

---

## Module-by-Module UX Plan

### Phase 1: Core Operations (Priority: HIGH)

#### 1. Dashboard Hub - Role-Based Home

| Component       | Description                       |
| --------------- | --------------------------------- |
| KPI Cards       | Real-time metrics with sparklines |
| Activity Feed   | Timeline of recent actions        |
| Quick Actions   | Role-specific shortcuts           |
| Alerts Panel    | Pending approvals, overdue items  |
| Calendar Widget | Upcoming meetings/visits          |

**Design Features:**

- Drag-and-drop widget customization
- Dark/Light mode toggle
- Real-time data refresh indicators

#### 2. CRM Module - Lead to Customer Journey

```
Leads List → Lead Detail → Site Visit → Quote → Project
   │              │            │           │        │
   └── Filters    └── Timeline └── Photos  └── PDF  └── Gantt
       Kanban         Notes       GPS          Builder   Tasks
       Bulk Actions   Follow-ups  Checklist    Versioning
```

**Key Screens:**

| Screen       | UX Innovation                                   |
| ------------ | ----------------------------------------------- |
| Lead List    | Infinite scroll + smart filters + bulk actions  |
| Lead Detail  | Unified timeline (calls, visits, quotes, notes) |
| Customer 360 | Complete relationship view with all properties  |
| Pipeline     | Drag-drop Kanban with deal value visualization  |

#### 3. Quote Builder - Advanced Quote Generation

**Flow:**

```
Select Customer/Property → System Configuration → Auto-calculate →
Customize Items → Add Discounts → Preview → Send/Download
```

**Key Features:**

- Real-time pricing calculation
- DCR/Non-DCR panel auto-split
- Subsidy eligibility checker
- Multi-version comparison
- Professional PDF generation
- E-signature integration ready

#### 4. Project Management - Installation Tracking

**Views:**

| View     | Purpose                  |
| -------- | ------------------------ |
| Kanban   | Task status tracking     |
| Gantt    | Timeline visualization   |
| Calendar | Resource scheduling      |
| List     | Detailed task management |

**Key Components:**

- Milestone progress tracker
- Material requirement indicator
- Team workload view
- Photo documentation gallery
- Approval workflow integration

### Phase 2: Operations (Priority: MEDIUM)

#### 5. Inventory Management

**Dashboard Elements:**

- Stock level gauges
- Low stock alerts
- PO tracking status
- Vendor performance cards

**Key Screens:**

| Screen          | Features                                |
| --------------- | --------------------------------------- |
| Stock Dashboard | Visual stock levels, reorder indicators |
| Material Master | Product catalog with images, specs      |
| Purchase Orders | Create, track, receive workflow         |
| BOM Builder     | Drag-drop component assembly            |
| MRP Planning    | Auto-requisition based on projects      |

#### 6. Finance & Payments

**Key Features:**

- Payment collection tracker
- Invoice generation (GSTIN compliant)
- Payment milestone tracking
- Receivables aging report
- GST report generation

### Phase 3: Analytics & Admin (Priority: MEDIUM-LOW)

#### 7. Analytics Dashboard

**Report Types:**

| Report            | Visualization               |
| ----------------- | --------------------------- |
| Sales Performance | Bar charts, trend lines     |
| Project Status    | Donut charts, progress bars |
| Revenue Analysis  | Area charts, comparisons    |
| Team Performance  | Leaderboards, heat maps     |
| Conversion Funnel | Funnel visualization        |

#### 8. Administration

**Key Screens:**

- User Management (CRUD, role assignment)
- Role & Permission Matrix
- Organization Settings
- Notification Preferences
- Integration Settings (WhatsApp, SMS, Email)
- Audit Logs

---

## UX Innovation Highlights

### 1. Command Palette (⌘K / Ctrl+K)

Quick access to any screen, action, or data:

```
> Search leads...
> Create new quote for [customer]
> Go to project PRJ-2025-042
> Approve pending requests
```

### 2. Smart Notifications Center

- Grouped by priority
- One-click actions
- Mute/Schedule options

### 3. Contextual Quick Actions

Floating action button with context-aware options:

- On Leads page: + New Lead, Import, Export
- On Projects page: + New Project, Site Visit, Report

### 4. Data Tables with Superpowers

- Column customization
- Saved views/filters
- Inline editing
- Bulk actions
- Export to Excel/CSV

### 5. Guided Workflows

Multi-step wizards for complex operations:

- Lead Creation Wizard
- Quote Builder Flow
- Project Setup Wizard
- Material Requisition

---

## Technical Implementation Approach

### Option A: Continue Static HTML + Tailwind (Current)

**Pros:**

- Quick to build
- Easy to preview
- No build step required

**Cons:**

- No interactivity
- Hard to maintain
- Code duplication

### Option B: Next.js + Tailwind + shadcn/ui (Recommended)

**Pros:**

- Already have Next.js web app setup
- Component reusability
- Real interactivity
- Easy backend integration later

**Recommended Stack:**

```
Framework:    Next.js 14 (App Router)
Styling:      Tailwind CSS + shadcn/ui
State:        React Query (TanStack)
Charts:       Recharts or Tremor
Tables:       TanStack Table
Forms:        React Hook Form + Zod
Icons:        Lucide Icons
Animations:   Framer Motion
```

### Option C: Hybrid (Pragmatic)

- Keep static HTML for rapid prototyping
- Gradually convert to Next.js components
- Share design system between both

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Design system setup (colors, typography, components)
- [ ] Layout system (sidebar, header, breadcrumbs)
- [ ] Common components library
- [ ] Auth screens (login, forgot password)
- [ ] Role-based dashboard shells

### Phase 2: CRM Module (Week 3-4)

- [ ] Lead management (list, detail, create)
- [ ] Customer management
- [ ] Sales pipeline (Kanban)
- [ ] Follow-up system

### Phase 3: Quote & Project (Week 5-6)

- [ ] Quote builder wizard
- [ ] Quote list & versions
- [ ] Project list & detail
- [ ] Task management
- [ ] Gantt view

### Phase 4: Operations (Week 7-8)

- [ ] Inventory dashboard
- [ ] Purchase orders
- [ ] Vendor management
- [ ] Payment tracking
- [ ] Invoice generation

### Phase 5: Analytics & Polish (Week 9-10)

- [ ] Analytics dashboards
- [ ] Admin settings
- [ ] User management
- [ ] Dark mode
- [ ] Mobile responsiveness

---

## Gap Analysis

### Current vs Proposed Comparison

| Module    | Current State | Proposed Additions               |
| --------- | ------------- | -------------------------------- |
| Dashboard | Basic metrics | Role-based, customizable widgets |
| Leads     | List + detail | Kanban, timeline, bulk actions   |
| Quotes    | Basic list    | Builder wizard, versioning, PDF  |
| Projects  | Basic view    | Gantt, Kanban, resource view     |
| Inventory | Stock view    | MRP, BOM builder, alerts         |
| Finance   | Reports       | Payment tracking, aging, GST     |
| Analytics | Basic charts  | Interactive, drill-down, exports |
| Settings  | Minimal       | Full IAM, integrations, audit    |

---

## Appendix

### A. Domain Enumerations

#### Customer Status

```typescript
enum CustomerStatus {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```

#### Lead Temperature

```typescript
enum LeadTemperature {
  HOT = 'hot', // Follow-up in 3 days
  WARM = 'warm', // Follow-up in 10 days
  COLD = 'cold', // Follow-up in 15 days
}
```

#### Project Status

```typescript
enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  TESTING = 'testing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}
```

#### Quote Status

```typescript
enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}
```

#### Milestone Types

```typescript
enum MilestoneType {
  SITE_SURVEY = 'site_survey',
  DESIGN = 'design',
  APPROVAL = 'approval',
  MATERIAL_PROCUREMENT = 'material_procurement',
  INSTALLATION = 'installation',
  TESTING = 'testing',
  COMMISSIONING = 'commissioning',
  HANDOVER = 'handover',
}
```

### B. Related Documentation

- [NX Usage Guide](./NX-USAGE-GUIDE.md)
- [CI/CD with NX](./CI-CD-WITH-NX.md)
- [Docker Documentation](./DOCKER.md)
- [Backend README](../apps/backend/README.md)
- [Shared Package README](../libs/shared/README.md)

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize modules** based on business needs
3. **Choose implementation approach** (HTML vs Next.js)
4. **Start with Phase 1** - Design system and foundation
5. **Iterate based on feedback**

---

_Document maintained by the OneOhm Development Team_
