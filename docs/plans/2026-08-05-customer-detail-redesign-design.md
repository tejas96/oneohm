# Design Document: Customer Details Screen Redesign (V2 OneOhm Alignment)

**Date:** 2026-08-05  
**Topic:** Customer Details Screen UI/UX Complete Redesign  
**Design System:** OneOhm Design System (HelioGrid DS - Matched to Customer List Page)  
**Target Route:** `/customers/[id]` (`http://localhost:3001/customers/75879e33-c8b8-4d60-b5a8-50fe8a303bb4`)  
**Stitch Screen ID:** `projects/9532433856706886612/screens/813b62a0253e464f98e8455dbdfb6d0b`

---

## 1. Executive Summary & Design System Standards

This design document outlines the complete UI/UX overhaul of the Customer Details page (`CustomerDetailPage`, `CustomerDetailHeader`, `CustomerDetailKpiStrip`, `CustomerAttentionPanel`, and **all 9 sub-tabs**).

The redesign strictly matches the OneOhm Design System tokens (`@/lib/theme/tokens.ts`) and component patterns established in the Customer List page (`customer-list-page.tsx`, `customer-kpi-cards.tsx`).

### Core OneOhm Rules Applied:
1. **Zero 1px Structural Borders:** Surfaces separate through background contrast (warm stone canvas `#FAFAF9` vs pure white `#FFFFFF` cards) and low-opacity elevation shadows (`shadow.e1` to `shadow.e3`).
2. **Text Overflow & Flex-Shrink Safety:** Avatars (`MUIAvatar`), status chips (`CrmStatusPill` / `MUIStatusChip`), and action icons carry `flexShrink: 0`, `minWidth: 0`, and `noWrap` so text **never breaks or crushes icons** even with long names or high ₹ amounts.
3. **Geist & Mono Typography:**
   - Overline micro-labels: `11px`, `fontWeight: 700`, `letterSpacing: '0.12em'`, uppercase (`var(--text-overline-track)`).
   - Figures & Codes: Geist Mono with `tabular-nums` for currency (`₹4,52,471`), system sizes (`kWp`), dates, and codes.
4. **Signature Circular Icon Containers:** Action & category icons sit inside perfect `36px` / `40px` circles with a 6% tint background wash (`#0D74B8` blue, `#76C044` green, `#EAB308` amber).
5. **Fully Pill Action Buttons & Chips:** All buttons, status indicators, and tab triggers use `borderRadius: 999px`.

---

## 2. Component Architecture & Fixes

### 2.1 Header Hero Card (`CustomerDetailHeader`)
- **Card Surface:** Floating `shadow.e2` borderless card (`radius.card-expressive` / `24px`) with an ambient radial brand glow wash (`glow-brand`).
- **Flex Layout Fix:** 48px `MUIAvatar` (`flexShrink: 0`), customer name (`minWidth: 0`, Geist Bold), customer code pill badge (`Geist Mono`), and `MUIStatusChip`. Icons and text **never overlap or break**.
- **Contact Action Badges:** 36px circular icon button shortcuts for Call (`tel:`), WhatsApp (`WhatsAppIcon`), and Email with 6% brand blue background wash.
- **Action Buttons:** Fully pill (`999px`) buttons (Brand Green primary `+ Follow-up`, white `shadow.e1` secondary `Edit`, `Property`, `Quote`).

### 2.2 Key Metric KPI Cards (`CustomerDetailKpiStrip`)
- **Grid Layout:** 6 responsive floating cards (`shadow.e2`, 12px radius, zero border) matching `CustomerKpiCards`.
- **Stat Typography:** Overline uppercase heading (`0.12em` tracking), 20px bold Geist value with `tabular-nums`, and delta direction indicators.

### 2.3 Attention Banner (`CustomerAttentionPanel`)
- Soft rounded warning card (`radius.card-functional`) with 36px amber circular icon badge and "View All" green accent pill button.

### 2.4 Tab Navigation Shell (`CustomerDetailPage`)
- Segmented container for tabs with pill triggers, Brand Green active indicator, and smooth transition easings.

---

## 3. Comprehensive Sub-Tabs Redesign

1. **Overview Tab (`OverviewTab`)**: Contact Card, Financial Snapshot, Property Pipeline Strip, Upcoming Follow-ups, and Open Service Tickets — all converted to borderless `shadow.e1` cards, overline `0.12em` labels, circular icon badges, and full text overflow safety.
2. **Properties Tab (`PropertiesTab`)**: Header with count pill badge & "Add Property" pill button. Table updated to OneOhm `CrmTable` styling: zebra striping (`#FFFFFF` / `#FAF9F7`), zero 1px cell borders, `tabular-nums`, primary property badge, and `OpenInNew` pill action buttons. Empty state equipped with rounded icon container & green pill button.
3. **Quotes Tab (`QuotesTab`)**: Borderless table/cards with quote status pills (`APPROVED`, `SENT`, `DRAFT`), system capacity (`kWp` in Geist Mono), formatted ₹ amounts, valid-until dates, and PDF view action pills.
4. **Projects Tab (`ProjectsTab`)**: Project progress cards featuring progress bars, stage status pills, kWp capacity badges, DISCOM utility details, and milestone timelines with circular stage nodes.
5. **Documents Tab (`DocumentsTab`)**: Property filter bar styled to match `CrmTable` inputs. Document grid with circular file-type icon badges (PDF, Image, CAD), file sizes, upload timestamps, and preview/download action pills.
6. **Followups Tab (`FollowupsTab`)**: Timeline view with category circular badges (Call, Meeting, Site Visit, Email), scheduled date/time badges, status pills (`PENDING`, `COMPLETED`), and "Schedule Follow-up" primary green pill button.
7. **Finance Tab (`FinanceTab`)**: KPI summary cards for Total Outstanding, 30/60/90+ Aging Buckets, Last Receipt Date, and Payment History table formatted with `tabular-nums` and status pills.
8. **Service Tab (`ServiceTab`)**: Service ticket cards with priority badges (`HIGH`, `MEDIUM`, `LOW`), issue status chips, assignee avatars (`MUIAvatar`), and issue description wrappers with text truncation safety.
9. **Activity Tab (`ActivityTab`)**: Vertical audit stream with icon nodes, user avatars (`MUIAvatar`), formatted timestamps, and clear change logs.

---

## 4. Verification Requirements
- **100% Business Logic Preservation:** All hooks (`useCustomer`, `useCustomerProperties`, `useCustomerFollowups`, `useDeleteCustomer`), state handlers, drawers (`CustomerEditDrawer`, `FollowupDrawer`, `PropertyDetailDrawer`), and modals (`PropertySelectModal`, `DeleteConfirmationDialog`) remain unchanged.
- **Route Navigation:** URL search parameters (`?tab=...`, `?docProperty=...`) and route pushes (`/customers`, `/onboarding/new`) are fully preserved.
- **Build & Lint Verification:** `npm run typecheck` and zero runtime console errors.
