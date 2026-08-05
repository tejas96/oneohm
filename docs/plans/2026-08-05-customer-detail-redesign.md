# Customer Details Screen Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Completely redesign the Customer Details screen (`/customers/[id]`) using the OneOhm Design System while preserving 100% of business logic, state management, drawers, and route navigation.

**Architecture:** Refactor `CustomerDetailHeader`, `CustomerDetailKpiStrip`, `CustomerAttentionPanel`, `CustomerDetailPage`, and tab wrappers to remove legacy 1px structural borders, apply soft elevation shadows (`shadow.e1` to `shadow.e3`), Geist typography with overline uppercase micro-labels (`0.12em` letter-spacing), fully pill buttons (`999px`), 6% color tinted circular icon badges, and WCAG AA accessible contrast ratios.

**Tech Stack:** Next.js 15, React 19, MUI v6 (`muiTheme`), Tailwind CSS v4, Geist Sans & Geist Mono fonts, Lucide / MUI Icons.

---

### Task 1: Refactor Key Metric KPI Strip (`CustomerDetailKpiStrip`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/kpi-strip.tsx`

**Step 1: Replace 1px outlined card with borderless elevation card & overline label**
Update `kpi-strip.tsx` to remove `variant="outlined"`, apply `boxShadow: (theme) => theme.shadows[1]`, `borderRadius: '12px'`, `border: 'none'`, and update label typography to uppercase overline with `letterSpacing: '0.12em'`.

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
Update `attention-panel.tsx` to wrap contents in a soft warning card (`border: 'none'`, `borderRadius: '12px'`, `boxShadow: (theme) => theme.shadows[1]`), add circular amber warning icon container, and format view button as a pill button.

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
Update `header.tsx` to use `boxShadow: (theme) => theme.shadows[2]`, `borderRadius: '16px'`, `border: 'none'`, 48px avatar, Geist Mono customer code badge, circular 36px icon containers for contact shortcuts (Call, WhatsApp, Email), and fully pill buttons (`borderRadius: '999px'`) for primary actions.

**Step 2: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/header.tsx
git commit -m "refactor(customers): update header with OneOhm borderless card, pill buttons, and quick action circles"
```

---

### Task 4: Refactor Customer Detail Page & Tab Navigation (`CustomerDetailPage`)

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/customer-detail-page.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tab-skeleton.tsx`

**Step 1: Update tab container and skeleton loader**
Update `customer-detail-page.tsx` to remove `variant="outlined"` from the main tab container, apply `boxShadow: (theme) => theme.shadows[2]`, `borderRadius: '16px'`, `border: 'none'`, style `Tabs` with pill-segment highlights, and update `tab-skeleton.tsx` to match 12px rounded cards.

**Step 2: Verify type check & build**
```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck
```

**Step 3: Commit**
```bash
git add apps/web/components/features/customers/customer-detail/customer-detail-page.tsx apps/web/components/features/customers/customer-detail/tab-skeleton.tsx
git commit -m "refactor(customers): update CustomerDetailPage tabs and skeleton with OneOhm design system"
```

---

Plan complete and saved to `docs/plans/2026-08-05-customer-detail-redesign.md`.
Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.
