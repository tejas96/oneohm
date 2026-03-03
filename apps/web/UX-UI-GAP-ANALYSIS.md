# UX vs UI Gap Analysis - Sales & CRM Module

> **Systematic review comparing UX designs (`apps/ux/web/v2/`) with implemented UI (`apps/web/`)**

---

## 🚨 Critical Global Issues

### 1. Layout Shell Missing/Incomplete

**UX Design (All Screens):**

- Header: 48px fixed with logo, global search (⌘K), notifications bell, user avatar
- Rail: 48px fixed icon sidebar (Dashboard, CRM, Quotes, Projects, Inventory, Finance, Service, Analytics)
- Panel: 200px collapsible sidebar with contextual navigation
- Panel toggle with keyboard shortcut (⌘\)

**Implementation Status:**

- ✅ Rail component exists (`layout/rail.tsx`)
- ✅ Panel component exists (`layout/panel.tsx`)
- ✅ Header component exists (`layout/header.tsx`)
- ❌ Feature pages NOT wrapped in layout shell properly
- ❌ Navigation config needs CRM panel items with sub-items (Hot/Warm/Cold)

**Fix Required:**

- Update navigation config (`lib/config/navigation.ts`) to match UX panel structure
- Ensure all CRM pages use dashboard layout with Rail + Panel

---

## 📋 Screen-by-Screen Gap Analysis

---

### 1. Customers List (`crm/customers.html` vs `customer-list-page.tsx`)

| Feature                | UX                                                                                                                     | Implementation                          | Gap                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Page Header**        | Title + subtitle + Import/Export/Add buttons                                                                           | ✅ Present                              | -                                                                                                |
| **Search Bar**         | Prominent search in filter section                                                                                     | ❌ Table has search but not as UX shows | Search should be more prominent                                                                  |
| **Status Tabs**        | All/Lead/Prospect/Active/Inactive                                                                                      | ⚠️ Has All/Active/Leads/Inactive        | Missing "Prospect" tab                                                                           |
| **Lead Source Filter** | Dropdown filter                                                                                                        | ❌ Missing                              | Add lead source dropdown                                                                         |
| **Table Columns**      | Customer (avatar+name+email+properties), Contact icons, City, Lead Source, Assigned To, Status, Last Activity, Actions | ⚠️ Partial                              | Missing: City, Assigned To, Last Activity, Contact icons (phone/WhatsApp), Avatar in name column |
| **Customer Column**    | Avatar initials + name + email + property count icon                                                                   | ❌ Simple name link                     | Need composite cell with avatar                                                                  |
| **Contact Column**     | Phone + WhatsApp icon buttons                                                                                          | ❌ Plain phone text                     | Add icon buttons for call/WhatsApp                                                               |
| **Row Selection**      | Checkbox column with select-all                                                                                        | ❌ Missing                              | Add selection with DataTable                                                                     |
| **Bulk Actions Bar**   | Appears when items selected                                                                                            | ❌ Missing                              | Add bulk actions (Change Status, Export, Delete)                                                 |
| **Export Dropdown**    | CSV/Excel options                                                                                                      | ⚠️ Single button                        | Add dropdown with options                                                                        |
| **Mobile Cards View**  | Card layout for mobile                                                                                                 | ❌ Missing                              | Add responsive card view                                                                         |

**Priority Fixes:**

1. Add avatar + email + property count to Customer column
2. Add Contact column with phone/WhatsApp icons
3. Add City, Assigned To, Last Activity columns
4. Add Lead Source dropdown filter
5. Add row selection + bulk actions
6. Add Prospect to filter tabs

---

### 2. Customer Detail (`crm/customer-detail.html` vs `customer-detail-page.tsx`)

| Feature             | UX                                              | Implementation | Gap                              |
| ------------------- | ----------------------------------------------- | -------------- | -------------------------------- |
| **Breadcrumb**      | Customers > [Name]                              | ✅ Present     | -                                |
| **Header**          | Name + Status badge + Created date              | ⚠️ Partial     | Missing status badge in header   |
| **Contact Card**    | Phone with call/WhatsApp icons, Email, Address  | ⚠️ Partial     | Missing icon buttons             |
| **Quick Stats**     | Properties count, Total Quotes, Active Projects | ❌ Missing     | Add stats row                    |
| **Inline Edit**     | Click to edit fields                            | ⚠️ Basic       | Need hover effects per UX        |
| **Properties List** | Mini-cards with temperature badges              | ⚠️ Partial     | Missing temperature color coding |
| **Recent Activity** | Timeline with icons                             | ⚠️ Basic       | Style doesn't match UX           |
| **Tabs**            | Quotes/Documents/Projects/All Activity          | ⚠️ Basic       | Tab content not matching UX      |
| **Action Buttons**  | Add Property, Create Quote, Schedule Visit      | ⚠️ Present     | Styling differs                  |

**Priority Fixes:**

1. Add Quick Stats row (Properties, Quotes, Projects counts)
2. Add phone/WhatsApp/email icon buttons with hover
3. Style tabs content to match UX
4. Add temperature color dots to properties
5. Improve activity timeline styling

---

### 3. Create Customer Wizard (`crm/create-customer.html` vs `create-customer-wizard.tsx`)

| Feature                    | UX                                                                   | Implementation             | Gap                             |
| -------------------------- | -------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| **Step Indicator**         | Horizontal stepper with icons                                        | ⚠️ Using Stepper component | Verify styling matches          |
| **Step 1 - Customer Info** | First/Last name, Phone with +91, Email, Lead Source                  | ⚠️ Partial                 | Verify all fields present       |
| **Step 2 - Property**      | Property name, type selector, Address fields                         | ⚠️ Present                 | Verify styling                  |
| **Step 3 - Electricity**   | DISCOM, Consumer #, Connection type, Sanctioned load                 | ⚠️ Present                 | Verify field order              |
| **Step 4 - Lead Status**   | Temperature selector (Hot/Warm/Cold), Follow-up date, Notes          | ⚠️ Present                 | Temperature buttons styling     |
| **Step 5 - Review**        | Summary of all entered data, "Same as property" checkbox for billing | ⚠️ Basic                   | Need proper summary cards       |
| **Temperature Buttons**    | Visual buttons with active state animation                           | ⚠️ Radio cards             | Need visual temperature buttons |
| **Progress Bar**           | Shows current step                                                   | ✅ Stepper handles this    | -                               |
| **Navigation**             | Back/Continue/Skip buttons                                           | ✅ Present                 | -                               |

**Priority Fixes:**

1. Style temperature selector as visual buttons (not radio cards)
2. Add "Same as property address" checkbox for billing
3. Create proper summary cards in Review step
4. Verify all field validations

---

### 4. Properties List (`crm/properties.html` vs `property-list-page.tsx`)

| Feature                          | UX                                                                              | Implementation             | Gap                         |
| -------------------------------- | ------------------------------------------------------------------------------- | -------------------------- | --------------------------- |
| **Temperature Tabs**             | All/Hot/Warm/Cold with colored dots                                             | ⚠️ Has tabs                | Missing colored status dots |
| **Table Columns**                | Property (name+address), Customer, Lead Temp, Site Visit, Quote Status, Actions | ⚠️ Partial                 | Verify all columns          |
| **Lead Temp Badge**              | Colored pill with dot                                                           | ⚠️ Using Badge             | Add dot indicator           |
| **Mark as Lost Modal**           | Reason selection, notes                                                         | ✅ Present                 | -                           |
| **Temperature Filter Sub-items** | In panel: Hot (5), Warm (18), Cold (24)                                         | ❌ Panel not showing these | Update navigation config    |

**Priority Fixes:**

1. Add colored dots to temperature tabs
2. Ensure panel shows temperature sub-items with counts
3. Add Site Visit and Quote Status columns if missing

---

### 5. Property Detail (`crm/property-detail.html` vs `property-detail-page.tsx`)

| Feature                      | UX                                                     | Implementation | Gap                         |
| ---------------------------- | ------------------------------------------------------ | -------------- | --------------------------- |
| **Breadcrumb**               | Customers > [Name] > [Property]                        | ✅ Present     | -                           |
| **Header**                   | Property name + Temperature badge + "Wants Loan" badge | ⚠️ Partial     | Missing Wants Loan badge    |
| **Action Buttons**           | Schedule Visit, Create Quote, Convert to Project       | ⚠️ Present     | Verify all three            |
| **Site Address Card**        | Full address with edit                                 | ⚠️ Present     | Verify inline edit          |
| **Electricity Details Card** | DISCOM, Consumer #, Connection, Load, Meter, Bill      | ⚠️ Present     | Verify all fields           |
| **Lead Status Card**         | Temperature selector + Notes                           | ⚠️ Present     | Temperature buttons styling |
| **Follow-ups Section**       | Table with pending/completed, Add button               | ⚠️ Present     | Verify styling              |
| **Quotes Section**           | Mini table with status                                 | ⚠️ Present     | Verify styling              |
| **Tabs**                     | Follow-ups/Quotes/Site Visits/Documents                | ⚠️ Basic       | Content styling             |

**Priority Fixes:**

1. Add "Wants Loan" badge to header
2. Style temperature selector as visual buttons
3. Verify all electricity fields are present
4. Add proper follow-up actions

---

### 6. Follow-ups List (`crm/followups.html` vs `followup-list-page.tsx`)

| Feature               | UX                                                              | Implementation         | Gap                       |
| --------------------- | --------------------------------------------------------------- | ---------------------- | ------------------------- |
| **Tabs**              | Today/Overdue/Upcoming/Completed                                | ✅ Present             | -                         |
| **Stats Cards**       | Today count, Overdue count (with alert styling)                 | ⚠️ Basic               | Overdue needs red styling |
| **Table**             | Property, Customer, Type, Subject, Date/Time, Priority, Actions | ⚠️ Partial             | Verify all columns        |
| **Priority Badge**    | Colored (High=red, Normal=yellow, Low=green)                    | ✅ Using Badge variant | -                         |
| **Quick Actions**     | Complete, Reschedule, Add Note                                  | ⚠️ Basic               | Verify all actions        |
| **Overdue Highlight** | Red background for overdue items                                | ❌ Missing             | Add row styling           |

**Priority Fixes:**

1. Add red styling for overdue stats card
2. Add red row background for overdue items
3. Verify all action buttons present

---

### 7. Site Visits List (`crm/site-visits.html` vs `site-visit-list-page.tsx`)

| Feature                  | UX                                                                | Implementation | Gap                      |
| ------------------------ | ----------------------------------------------------------------- | -------------- | ------------------------ |
| **Stats Cards**          | Today's, Pending, Completed                                       | ✅ Present     | -                        |
| **Status Tabs**          | All/Pending/In Progress/Completed                                 | ✅ Present     | -                        |
| **Table Columns**        | Property, Customer, Technician, Type, Date/Time, Status, Priority | ⚠️ Partial     | Verify all               |
| **Calendar View Toggle** | List/Calendar views                                               | ❌ Missing     | Add calendar view option |

**Priority Fixes:**

1. Add calendar view toggle (can be Phase 2)
2. Verify all table columns

---

### 8. Site Visit Detail (`crm/site-visit-detail.html` vs `site-visit-report.tsx`)

| Feature             | UX                                                                          | Implementation | Gap                 |
| ------------------- | --------------------------------------------------------------------------- | -------------- | ------------------- |
| **Report Sections** | Summary, Site Assessment (Roof, Electrical), Recommendations, Photos, Notes | ⚠️ Present     | Verify all sections |
| **Photo Gallery**   | Grid with categories                                                        | ⚠️ Basic       | Need category tabs  |
| **GPS Location**    | Map embed                                                                   | ⚠️ Basic       | May need actual map |
| **Timeline**        | Visit history                                                               | ⚠️ Present     | Verify styling      |
| **Actions**         | Create Quote, Schedule Follow-up                                            | ⚠️ Present     | Verify              |

**Priority Fixes:**

1. Add photo categories (Roof, Electrical, etc.)
2. Verify all assessment fields

---

### 9. Pipeline/Funnel (`crm/pipeline.html` vs `pipeline-page.tsx`)

| Feature                  | UX                                                     | Implementation           | Gap                   |
| ------------------------ | ------------------------------------------------------ | ------------------------ | --------------------- |
| **Summary Cards**        | Total Value, Conversion Rate, Avg Deal Size, Avg Cycle | ⚠️ Present               | Verify styling        |
| **Funnel Visualization** | SVG funnel with stages, values, counts                 | ⚠️ Using FunnelChart     | Verify visual matches |
| **Stage Drill-down**     | Click stage to see items                               | ⚠️ Using DrillDownDrawer | Verify functionality  |
| **Date Filter**          | This Month/Quarter/Year/Custom                         | ⚠️ Basic                 | Add more options      |
| **Insights Cards**       | AI insights, stale leads, etc.                         | ⚠️ Basic                 | Verify content        |

**Priority Fixes:**

1. Verify funnel visual matches UX
2. Verify drill-down works correctly

---

### 10. Quotes List (`quotes/list.html` vs `quote-list-page.tsx`)

| Feature           | UX                                                                    | Implementation | Gap              |
| ----------------- | --------------------------------------------------------------------- | -------------- | ---------------- |
| **Status Tabs**   | All/Draft/Sent/Accepted/Rejected/Expired                              | ⚠️ Has some    | Missing Expired  |
| **Summary Cards** | Total Quotes, Pending Value, Accepted Value, Conversion Rate          | ⚠️ Basic       | Verify all       |
| **Table Columns** | Quote#, Customer, Property, System Size, Value, Status, Date, Actions | ⚠️ Partial     | Verify           |
| **Quick Actions** | View, Edit, Send, Download PDF                                        | ⚠️ Basic       | Add PDF download |

**Priority Fixes:**

1. Add Expired to tabs
2. Add PDF download action
3. Verify all columns present

---

### 11. Quote Builder (`quotes/builder.html` vs `quote-builder.tsx`)

| Feature                        | UX                                                      | Implementation               | Gap                         |
| ------------------------------ | ------------------------------------------------------- | ---------------------------- | --------------------------- |
| **Layout**                     | 55% config, 45% live preview                            | ⚠️ Present                   | Verify proportions          |
| **Collapsible Steps**          | Accordion-style with summaries                          | ✅ Using CollapsibleStepCard | -                           |
| **Step 1 - Customer/Property** | Customer selector, Property selector                    | ✅ Present                   | -                           |
| **Step 2 - System Config**     | Size input with quick select chips, Project type, Phase | ⚠️ Present                   | Verify quick select styling |
| **Quick Size Chips**           | 3/5/7/10/15/20 kW with active state                     | ⚠️ Present                   | Verify active animation     |
| **DCR Toggle**                 | Full DCR / Non-DCR / Mixed                              | ✅ Present                   | -                           |
| **Step 3 - Equipment**         | Panel selection, Inverter selection                     | ⚠️ Basic                     | May need product cards      |
| **Step 4 - Pricing**           | Floor, Distance, Discount                               | ✅ Present                   | -                           |
| **Live Preview**               | Real-time calculation with subsidy                      | ⚠️ Present                   | Verify calculations display |
| **Subsidy Visualization**      | Progress bar, eligibility                               | ⚠️ Basic                     | Improve visual              |
| **Sticky Actions**             | Save Draft, Generate Quote                              | ✅ Present                   | -                           |

**Priority Fixes:**

1. Style quick size chips with animations
2. Improve live preview visualization
3. Add product selection cards (Phase 2)

---

### 12. Quote Detail (`quotes/detail.html` vs `quote-detail-page.tsx`)

| Feature                  | UX                            | Implementation | Gap                 |
| ------------------------ | ----------------------------- | -------------- | ------------------- |
| **Status Banner**        | Prominent status with actions | ⚠️ Present     | Verify styling      |
| **Quote Summary**        | All config details            | ⚠️ Present     | Verify completeness |
| **Version History**      | Timeline of versions          | ⚠️ Present     | Verify              |
| **Activity Timeline**    | All quote activities          | ⚠️ Present     | Verify              |
| **Accept/Reject Modals** | Signature, reason input       | ✅ Present     | -                   |
| **PDF Preview/Download** | View/download quote PDF       | ❌ Missing     | Add PDF generation  |
| **Share Options**        | Email, WhatsApp, Copy link    | ❌ Missing     | Add share buttons   |

**Priority Fixes:**

1. Add PDF preview/download
2. Add share buttons (Email, WhatsApp, Copy link)

---

## 🎨 Styling Gaps (Global)

### Typography

| UX                                  | Implementation             |
| ----------------------------------- | -------------------------- |
| Body: `text-[13px]`                 | ⚠️ Verify consistency      |
| Labels: `text-[13px] font-medium`   | ⚠️ Some using `text-sm`    |
| Titles: `text-[15px] font-semibold` | ⚠️ Some using larger sizes |
| Badges: `text-[11px] font-medium`   | ✅ Badge component handles |

### Visual Elements

| UX                        | Implementation                  |
| ------------------------- | ------------------------------- |
| Border: `border-gray-100` | ⚠️ Some using `border-gray-200` |
| Radius: `rounded-lg`      | ⚠️ Some using `rounded-xl`      |
| Shadow: `shadow-sm`       | ⚠️ Some using `shadow-md`       |
| Padding: `p-4`            | ⚠️ Some using `p-5`/`p-6`       |

### Table Styling

| UX                                                        | Implementation       |
| --------------------------------------------------------- | -------------------- |
| Row height: `py-2` (44px)                                 | ⚠️ Verify            |
| Header: `text-[11px] font-medium text-gray-500 uppercase` | ⚠️ Verify            |
| Hover: `hover:bg-gray-50`                                 | ✅ DataTable handles |

---

## 📊 Priority Matrix

### P0 - Critical (Fix Immediately)

1. Navigation config - Add CRM panel items with Hot/Warm/Cold sub-items
2. Customer list - Add avatar, Contact icons, missing columns
3. Temperature selectors - Visual button styling across all screens
4. Row selection + Bulk actions - Customer/Property lists

### P1 - High (Fix This Sprint)

1. All screens - Verify they use layout shell (Rail + Panel)
2. Customer detail - Add quick stats, improve styling
3. Property detail - Add "Wants Loan" badge
4. Follow-ups - Add overdue row highlighting
5. Quote builder - Improve live preview visualization

### P2 - Medium (Next Sprint)

1. Mobile responsive - Card views for all lists
2. PDF generation - Quote detail
3. Share buttons - Quote detail
4. Calendar view - Site visits
5. Export dropdown - CSV/Excel options

### P3 - Low (Backlog)

1. Advanced filtering
2. Keyboard shortcuts
3. Animation refinements
4. Dark mode support

---

## ✅ Checklist for Each Screen Fix

Before marking a screen as "UX Complete":

- [ ] All UX columns/fields present
- [ ] Styling matches design tokens
- [ ] Actions (buttons, dropdowns) match UX
- [ ] Empty states match UX
- [ ] Loading states present
- [ ] Error states present
- [ ] Mobile responsive (if specified in UX)
- [ ] Tooltips on icon buttons
- [ ] Keyboard accessible
- [ ] Uses correct layout shell
