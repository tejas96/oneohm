# Customer Details Screen Complete Redesign Implementation Plan (V2)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Completely redesign the Customer Details screen (`/customers/[id]`) and **ALL 9 SUB-TABS** (`Overview`, `Properties`, `Quotes`, `Projects`, `Documents`, `Followups`, `Finance`, `Service`, `Activity`) using the OneOhm Design System (matching the Customer List page), fixing card layout overflow bugs on large text.

**Architecture:** Refactor `CustomerDetailHeader`, `CustomerDetailKpiStrip`, `CustomerAttentionPanel`, `CustomerDetailPage`, `tab-skeleton.tsx`, and all 9 sub-tabs (`tabs/*`) to remove legacy 1px structural borders, apply soft elevation shadows (`shadow.e1` to `shadow.e3`), Geist typography with overline uppercase micro-labels (`0.12em` letter-spacing), fully pill buttons (`999px`), 6% color tinted circular icon badges, flex-shrink-0 text truncation safety, and WCAG AA accessible contrast ratios.

**Tech Stack:** Next.js 15, React 19, MUI v6 (`muiTheme`), Tailwind CSS v4, Geist Sans & Geist Mono fonts, Lucide / MUI Icons.

---

### Task 1: Refactor Key Metric KPI Strip (`CustomerDetailKpiStrip`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/kpi-strip.tsx`

**Step 1: Replace 1px outlined card with borderless elevation card & overline label**
Update `kpi-strip.tsx` to remove `variant="outlined"`, apply `boxShadow: (theme) => theme.shadows[2]`, `borderRadius: '12px'`, `border: 'none'`, and update label typography to uppercase overline with `letterSpacing: '0.12em'` and `minWidth: 0` text overflow safety.

**Step 2: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/kpi-strip.tsx
git commit -m "refactor(customers): update KPI strip with OneOhm elevation cards and overline typography"
```

---

### Task 2: Refactor Attention Panel (`CustomerAttentionPanel`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/attention-panel.tsx`

**Step 1: Redesign attention panel with circular amber badge and soft warning card**
Update `attention-panel.tsx` to wrap contents in a soft warning card (`border: 'none'`, `borderRadius: '12px'`, `boxShadow: (theme) => theme.shadows[1]`), add 36px circular amber warning icon container, and format view button as a pill button.

**Step 2: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/attention-panel.tsx
git commit -m "refactor(customers): update attention panel with OneOhm circular badge and warning card"
```

---

### Task 3: Refactor Header & Quick Actions (`CustomerDetailHeader`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/header.tsx`

**Step 1: Redesign header with borderless elevation surface, ambient glow, and quick action icon circles**
Update `header.tsx` to use `boxShadow: (theme) => theme.shadows[2]`, `borderRadius: '24px'`, `border: 'none'`, 48px avatar (`flexShrink: 0`), Geist Mono customer code badge, circular 36px icon containers for contact shortcuts (Call, WhatsApp, Email), and fully pill buttons (`borderRadius: '999px'`) for primary actions. Apply text truncation safety on long names.

**Step 2: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/header.tsx
git commit -m "refactor(customers): update header with OneOhm borderless card, pill buttons, and quick action circles"
```

---

### Task 4: Refactor Customer Detail Page & Tab Navigation (`CustomerDetailPage` & `tab-skeleton.tsx`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/customer-detail-page.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tab-skeleton.tsx`

**Step 1: Update tab container and skeleton loader**
Update `customer-detail-page.tsx` to remove `variant="outlined"` from the main tab container, apply `boxShadow: (theme) => theme.shadows[2]`, `borderRadius: '16px'`, `border: 'none'`, style `Tabs` with pill-segment highlights, and update `tab-skeleton.tsx` to match 12px rounded cards.

**Step 2: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/customer-detail-page.tsx apps/web/components/features/customers/customer-detail/tab-skeleton.tsx
git commit -m "refactor(customers): update CustomerDetailPage tabs and skeleton with OneOhm design system"
```

---

### Task 5: Refactor Sub-Tabs (`tabs/*`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/tabs/overview-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/properties-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/quotes-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/projects-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/documents-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/followups-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/finance-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/service-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/activity-tab.tsx`

**Step 1: Refactor overview, properties, quotes, projects, documents, followups, finance, service, and activity tabs**
Remove all `variant="outlined"` cards and tables across all sub-tabs. Apply OneOhm elevation cards (`shadow.e1`), overline labels (`0.12em` tracking), Geist Mono for numbers/codes/capacity, circular icon containers, status pills, zebra-striped borderless tables, and pill action buttons.

**Step 2: Run Type Check & Verification**
```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck
```

**Step 3: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/tabs/
git commit -m "refactor(customers): update all sub-tabs with OneOhm design system components"
```

---

Plan complete and saved to `docs/plans/2026-08-05-customer-detail-redesign.md`.
Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.
