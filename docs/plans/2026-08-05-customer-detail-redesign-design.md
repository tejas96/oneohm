# Design Document: Customer Details Screen Redesign

**Date:** 2026-08-05  
**Topic:** Customer Details Screen UI/UX Redesign  
**Design System:** OneOhm Design System (HelioGrid DS)  
**Target Route:** `/customers/[id]` (`http://localhost:3001/customers/75879e33-c8b8-4d60-b5a8-50fe8a303bb4`)

---

## 1. Goal & Vision
Redesign the Customer Details screen (`CustomerDetailPage`, `CustomerDetailHeader`, `CustomerDetailKpiStrip`, `CustomerAttentionPanel`, and tab wrappers) to strictly align with the **OneOhm Design System**. The new UX provides a premium, calm, SaaS precision-instrument feel, removing legacy 1px structural borders, adopting soft floating elevation shadows (`e1`–`e3`), fully pill buttons (`999px`), Geist typography, overline uppercase micro-labels, circular icon containers with 6% color tint, and WCAG AA accessibility compliance.

---

## 2. Design System Alignment & Specifications

### 2.1 Color & Surface Hierarchy
- **Canvas & Page Background:** Warm stone canvas (`--canvas: #FAFAF9` / `--bg-page`).
- **Surface Elevation:** Pure white floating cards (`--surface: #FFFFFF`) with soft wide shadows (`shadow.e1` to `shadow.e3`). Zero 1px grey structural borders (`border: none`).
- **Brand Colors:**
  - **Brand Primary Green (`#76C044`):** Interactive accents, primary action buttons, active tab indicators.
  - **Brand Secondary Blue (`#0D74B8`):** Sub-accents, links, secondary action wash.
  - **Dark Stone Text (`#1C1917`):** High contrast heading text.
  - **Warm Muted Text (`#57534E`):** Body copy and secondary details.

### 2.2 Typography & Micro-Labels
- **Font Family:** Geist Sans (`var(--font-geist-sans)`), Geist Mono for codes/quantities (`customerCode`, monetary values, counts).
- **Overline Micro-Labels:** `11px`, `fontWeight: 700`, `letterSpacing: '0.12em'`, uppercase (e.g. `CUSTOMER PROFILE`, `METRIC OVERVIEW`, `ATTENTION REQUIRED`).
- **Tabular Numerals:** All financial figures (₹ formatting like `₹4,52,471`) and counts use `tabular-nums`.

### 2.3 Spacing, Radii & Buttons
- **Card Radius:** Functional cards use `12px` (`radius['rf-lg']` / `12px`).
- **Pill Geometry:** All buttons, status chips, and tab triggers use fully pill (`999px`) geometry.
- **Circular Icon Badges:** Action and status icons sit in 36px–40px perfect circle containers with a 6% tint of semantic/brand color.

---

## 3. Detailed Component Architecture

### Component 1: `CustomerDetailHeader`
- Replaces 1px border paper with floating `e2` card surface featuring an ambient brand radial wash (`glow-brand`).
- 48px `MUIAvatar` with initials, customer title in Geist Bold, customer code chip in Geist Mono.
- Contact quick-actions (Phone, WhatsApp, Email) styled with circular icon containers (`36px`, 6% brand blue tint `#0D74B8`).
- Fully pill action buttons (`Edit`, `+ Property`, `+ Quote`, `Log Follow-up`).
- Inactive alert banner styled as soft amber card with subtle warning tint.

### Component 2: `CustomerDetailKpiStrip`
- 6 floating metric cards (`shadow.e1`, 12px radius, no structural borders).
- Micro overline headings (`0.12em` tracking).
- Values in Geist tabular nums with semantic tone washes (e.g. outstanding AR in `#FEF7E6` background wash).

### Component 3: `CustomerAttentionPanel`
- Soft rounded warning card (`radius.lg`) with amber circular icon badge.
- List of overdue follow-ups / outstanding balance with one-click pill button navigation.

### Component 4: Section Navigation (`Tabs`)
- Segmented pill container for tabs (`Overview`, `Properties`, `Quotes`, `Projects`, `Documents`, `Followups`, `Finance`, `Service`, `Activity`).
- Active pill tab in Brand Green (`#76C044` / `accent-subtle`), smooth transition easings.

### Component 5: Tab Wrapper & Skeleton Loaders
- Borderless card panel enclosing active sub-tab view.
- Premium shimmer wave skeleton (`TabSkeleton`, `PageSkeleton`) and empty state illustrations.

---

## 5. Verification & Functionality Requirements
- **100% Business Logic Preservation:** All hooks (`useCustomer`, `useCustomerProperties`, `useCustomerFollowups`, `useDeleteCustomer`), state handlers, drawers (`CustomerEditDrawer`, `FollowupDrawer`, `PropertyDetailDrawer`), and modals (`PropertySelectModal`, `DeleteConfirmationDialog`) remain unchanged.
- **Route Navigation:** URL search parameters (`?tab=...`, `?docProperty=...`) and route pushes (`/customers`, `/onboarding/new`) are fully preserved.
- **Accessibility:** Tested for WCAG AA contrast ratios, focus rings (`2px #76C044`), aria-labels, and keyboard tab navigation.
