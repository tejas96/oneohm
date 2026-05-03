# End-to-End QA Test Scenarios

**Flow:** Customer Onboarding → Property → Quote (Create / Accept / Reject) → Quote-to-Project Conversion → Project (BOM, Team, Serials) → Inventory (Vendor, Warehouse, PO, Stock Allocation)

**Author:** Cursor Agent (sourced from current code in `apps/backend`, `apps/web`, `libs/shared`)
**Mode:** Manual QA — every scenario lists **Pre-conditions → Steps → Expected Result**.

> Tip: Use a fresh org-scoped login for each major run. Multi-tenant isolation must be re-verified at every stage.

---

## Legend


| Symbol | Meaning                        |
| ------ | ------------------------------ |
| ✅      | Happy path                     |
| ⚠️     | Edge / negative case           |
| 🔒     | Security / multi-org isolation |
| 🔁     | State transition / FSM         |
| 🧪     | Validation rule                |


---

## Section 0 — Pre-flight setup (do once per environment)


| #   | Scenario                                | Steps                                                                                                             | Expected Result                                                                                        |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0.1 | Login with valid org user               | Login as a user whose `organizationId` is set                                                                     | Dashboard loads; `X-Organization-Id` header is sent on subsequent API calls                            |
| 0.2 | ⚠️ Login with user missing organization | Login as a user with no org                                                                                       | API calls return 400 referencing `organizationId`; UI toasts "account not assigned to an organization" |
| 0.3 | Quote configuration exists              | Verify org has `quote_configuration` with `defaultValidityDays`, `gstConfig`, `maxVersions`                       | Calculator endpoints succeed without "missing config" 400s                                             |
| 0.4 | Master data seeded                      | Verify product types, brands, products with prices, installation pricing tiers, and (if used) subsidy rules exist | Calculator can resolve panels/inverters/structure                                                      |


---

## Section 1 — Customer Onboarding (Sales & CRM → Customers)

**Route:** `/customers/new` · **API:** `POST /api/v1/customers`

### 1.A Required-field validation (web form, Zod)


| #    | Scenario                            | Steps                                                                                                                                    | Expected Result                                                                               |
| ---- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1.1  | ✅ Create with all required fields   | Fill `firstName`, `lastName`, `phone` (10-digit Indian, starts 6-9), `city`, `state`, `pincode` (6 digits), `leadTemperature` and submit | Customer created; redirected to `/customers`; toast success                                   |
| 1.2  | 🧪 Missing first name               | Leave first name blank                                                                                                                   | Inline error: `First name is required`                                                        |
| 1.3  | 🧪 Missing last name                | Leave last name blank                                                                                                                    | Inline error: `Last name is required` (frontend stricter than backend — backend allows empty) |
| 1.4  | 🧪 First name > 100 chars           | Type 101 chars                                                                                                                           | Error: `First name too long`                                                                  |
| 1.5  | 🧪 Phone wrong length               | Enter 9 digits                                                                                                                           | Error: `Phone must be 10 digits`                                                              |
| 1.6  | 🧪 Phone starts with 1–5            | Enter `5123456789`                                                                                                                       | Error: `Enter a valid Indian mobile number`                                                   |
| 1.7  | 🧪 Alternate phone non-digits       | Enter `98ab`                                                                                                                             | Error: `Phone must contain only digits`                                                       |
| 1.8  | 🧪 Invalid email                    | Enter `abc@`                                                                                                                             | Error: `Invalid email address`                                                                |
| 1.9  | 🧪 Email empty allowed              | Leave email blank                                                                                                                        | No error; submit succeeds                                                                     |
| 1.10 | 🧪 Missing city                     | Blank city                                                                                                                               | Error: `City is required`                                                                     |
| 1.11 | 🧪 Missing state                    | Blank state                                                                                                                              | Error: `State is required`                                                                    |
| 1.12 | 🧪 Pincode 5 digits                 | Enter `40010`                                                                                                                            | Error: `Pincode must be 6 digits`                                                             |
| 1.13 | 🧪 Pincode non-digits               | Enter `abc123`                                                                                                                           | Error: `Pincode must be 6 digits`                                                             |
| 1.14 | 🧪 Address > 500 chars              | Paste long address                                                                                                                       | Error: `Address too long`                                                                     |
| 1.15 | 🧪 Lead source "Other" without text | Pick `Other`, leave specify field blank                                                                                                  | Error on `leadSourceOther`: `Please specify the source`                                       |
| 1.16 | 🧪 Lead source "Other" with text    | Pick `Other`, fill text                                                                                                                  | Submits successfully                                                                          |
| 1.17 | 🧪 Referral code > 50 chars         | Type 51 chars                                                                                                                            | Error: `Referral code too long`                                                               |


### 1.B Duplicate / availability checks


| #    | Scenario                                           | Steps                                                        | Expected Result                                                                                                                                   |
| ---- | -------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.18 | ⚠️ Duplicate phone (same org)                      | Create customer with phone X; create another with same phone | API 409: `A customer with phone '+91XXXXXXXXXX' already exists in this organization`; web shows `This phone number is already registered` on blur |
| 1.19 | ⚠️ Duplicate email (same org)                      | Same as above with email                                     | API 409: `A customer with email '...' already exists in this organization`                                                                        |
| 1.20 | 🔒 Same phone allowed across different orgs        | Create same phone in Org A then Org B                        | Both succeed (one user reused; second org gets new profile)                                                                                       |
| 1.21 | ✅ Phone availability check on blur                 | Enter valid 10-digit phone in form                           | `GET /customers/check-availability` fires; if dup, inline error appears, submit blocked                                                           |
| 1.22 | ⚠️ Both phone and email empty in availability call | (unit-test path)                                             | API 400: `At least one of phone or email is required`                                                                                             |
| 1.23 | ⚠️ Submit while availability errors visible        | With duplicate phone error showing, click Save               | Toast: `Please fix the duplicate phone/email errors` — no API call                                                                                |


### 1.C Group assignment


| #    | Scenario                                   | Steps                                    | Expected Result                                                                                                                 |
| ---- | ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1.24 | ✅ New group via `groupName` only           | Provide `groupName=ABC Society`, no code | Customer created; group code auto-generated                                                                                     |
| 1.25 | ⚠️ Existing groupCode                      | Provide existing `groupCode`             | Customer attached to that group                                                                                                 |
| 1.26 | ⚠️ Invalid groupCode                       | Provide non-existent `groupCode`         | API 400: `Group code 'XYZ' does not exist in this organization`; **note**: customer row is already persisted before group check |
| 1.27 | ⚠️ groupCode > 20 chars or groupName > 100 | Send oversized values                    | Validation errors                                                                                                               |


### 1.D Edit / status / assignee


| #    | Scenario                           | Steps                                     | Expected Result                                                       |
| ---- | ---------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| 1.28 | ✅ Edit customer                    | `/customers/[id]/edit` → change name      | Saves; detail page shows new name                                     |
| 1.29 | ⚠️ Set status to current status    | Try to change `active` → `active`         | API 400: `Customer is already in 'active' status`                     |
| 1.30 | ✅ Status flow                      | Lead → Prospect → Active → Inactive       | Each transition saves; lead list updates                              |
| 1.31 | ✅ Assign to employee in same org   | Use assignee selector                     | Saves; assignee shown                                                 |
| 1.32 | 🔒 Assign to user from another org | (API client) PATCH with foreign user UUID | 4xx; assignee not changed                                             |
| 1.33 | ⚠️ Unassign                        | Send `{ assigneeId: null }`               | Cleared                                                               |
| 1.34 | ⚠️ Missing `assigneeId` key        | Send `{}`                                 | API 400: `assigneeId must be present (use null to unassign)`          |
| 1.35 | ✅ Soft delete                      | Delete from list                          | Disappears from list; not retrievable; available phone re-usable next |


### 1.E Multi-org isolation


| #    | Scenario                                    | Steps                         | Expected Result             |
| ---- | ------------------------------------------- | ----------------------------- | --------------------------- |
| 1.36 | 🔒 Direct GET /customers/:id of another org | Use known UUID from other org | 404 (treated as not found)  |
| 1.37 | 🔒 List filter scoped                       | List page in Org A            | Only Org A customers appear |


---

## Section 2 — Property / Site Onboarding

**Route:** `/customers/[id]/properties/new` (or `/properties/new`) · **API:** `POST /api/v1/customer-properties`

### 2.A Required fields (Zod)


| #    | Scenario                                | Steps                                                                                       | Expected Result                              |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2.1  | ✅ Create property happy path            | Fill `propertyName`, `propertyType`, `address`, `city`, `pincode`, `leadTemperature`        | Property created; visible on customer detail |
| 2.2  | 🧪 Missing customerId                   | Use `/properties/new` without selecting customer                                            | Error: `Please select a customer`            |
| 2.3  | 🧪 Blank property name                  | Leave name                                                                                  | `Property name is required`                  |
| 2.4  | 🧪 Property name > 200                  | Long name                                                                                   | `Property name too long`                     |
| 2.5  | 🧪 Missing property type                | Don't pick a type                                                                           | `Please select a property type`              |
| 2.6  | 🧪 Blank address                        | Empty address                                                                               | `Address is required`                        |
| 2.7  | 🧪 Pincode invalid                      | 5 digits or letters                                                                         | `Pincode must be 6 digits`                   |
| 2.8  | 🧪 Sanctioned load 0                    | Enter 0                                                                                     | `Sanctioned load must be greater than 0`     |
| 2.9  | 🧪 Sanctioned load > 1000               | Enter 1500                                                                                  | `Sanctioned load too high`                   |
| 2.10 | 🧪 Monthly bill negative                | Enter -100                                                                                  | `Monthly bill cannot be negative`            |
| 2.11 | ✅ All `PropertyType` options selectable | Try residential, residential_apartment, commercial, industrial, agricultural, institutional | Each saves                                   |
| 2.12 | ✅ All `LeadTemperature` selectable      | hot/warm/cold                                                                               | Each saves                                   |


### 2.B Business rules


| #    | Scenario                                   | Steps                                                              | Expected Result                                                               |
| ---- | ------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 2.13 | ✅ First property auto-primary              | Create first property without ticking primary                      | `isPrimary=true` saved                                                        |
| 2.14 | ✅ Adding another with primary=true         | Create second property with primary checked                        | New one becomes primary; previous primary's flag flipped to false             |
| 2.15 | ⚠️ Set-primary on already-primary          | Click "Set as primary" on the primary property                     | API 400: `Property is already the primary property`                           |
| 2.16 | ⚠️ Duplicate consumer number (same org)    | Create P1 with consumerNumber=X; create P2 with same               | API 409: `Property with consumer number 'X' already exists`                   |
| 2.17 | ✅ Duplicate consumer number across orgs    | Use same value in different org                                    | Allowed (org-scoped)                                                          |
| 2.18 | ⚠️ Wants Loan = false after loan APPROVED  | Mark loan, get to APPROVED state, edit property to wantsLoan=false | API 400: bank status message blocks update                                    |
| 2.19 | ✅ Address pre-fill from customer           | Open form for customer with full address                           | Address fields pre-populated; can override                                    |
| 2.20 | ✅ Documents upload after create            | Add documents in form, save                                        | Property created first; documents uploaded via bulk doc API; appear in detail |
| 2.21 | 🔒 Add property to customer of another org | (API) Use foreign customerId                                       | 404                                                                           |


### 2.C Property status / temperature


| #    | Scenario                                     | Steps                                     | Expected Result                                     |
| ---- | -------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| 2.22 | ✅ Update temperature                         | PATCH temperature endpoint                | Saved                                               |
| 2.23 | ✅ Status defaults to `active`                | Create without status                     | Status `active` in DB                               |
| 2.24 | 🔁 Status `converted` after project creation | After successful Quote→Project conversion | Property status = `converted` (verify in detail)    |
| 2.25 | ⚠️ Delete property                           | Soft delete                               | Disappears from list; not selectable for new quotes |


---

## Section 3 — Quote Creation

**Route:** `/quotes/new` · **API:** `POST /api/v1/quote-calculator/create-from-calculation`

### 3.A Calculator validation


| #    | Scenario                                   | Steps                                                                                                                                | Expected Result                                                          |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 3.1  | ✅ Calculate with valid inputs              | Pick customer & property; enter `systemSizeKw=5`, `projectType=residential`, `phaseType`, `subsidyApplicable=false`, `structureType` | Calculation succeeds; preview renders panels/inverters/structure/pricing |
| 3.2  | 🧪 systemSizeKw < 1                        | Enter 0 or 0.5                                                                                                                       | DTO validation: must be ≥ 1                                              |
| 3.3  | 🧪 systemSizeKw > 1000                     | Enter 1500                                                                                                                           | Validation error                                                         |
| 3.4  | 🧪 Missing projectType                     | Omit                                                                                                                                 | 400                                                                      |
| 3.5  | 🧪 floorNumber > 50                        | Enter 60                                                                                                                             | Validation error                                                         |
| 3.6  | 🧪 distanceKm > 500                        | Enter 600                                                                                                                            | Validation error                                                         |
| 3.7  | 🧪 manualInverterCount > 20                | Enter 25                                                                                                                             | Validation error                                                         |
| 3.8  | ⚠️ No installation pricing for tier        | Pick size with no tier seeded                                                                                                        | 400 with descriptive message                                             |
| 3.9  | ⚠️ No products available                   | Empty product DB                                                                                                                     | 400 with `errorCode` / `suggestion`                                      |
| 3.10 | ✅ Subsidy applicable + valid IDs           | Toggle subsidy and pick rules                                                                                                        | Pricing reflects subsidy                                                 |
| 3.11 | ✅ DCR auto-split / dcr_only / non_dcr_only | Switch all three                                                                                                                     | Different panel mixes                                                    |


### 3.B Save quote


| #    | Scenario                                 | Steps                                          | Expected Result                                                                                                                                                       |
| ---- | ---------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.12 | ✅ Save from calculator                   | After calculate, click Save                    | Quote created in `draft`; `validUntil` = today + `defaultValidityDays`; redirected to quote detail                                                                    |
| 3.13 | 🧪 Save without customerId               | (force in URL)                                 | 400: customerId required                                                                                                                                              |
| 3.14 | 🧪 Save without propertyId               | Same                                           | 400: propertyId required                                                                                                                                              |
| 3.15 | 🧪 Discount > basePrice                  | Enter discount = base + 1                      | 400                                                                                                                                                                   |
| 3.16 | 🧪 Payment milestones not summing to 100 | 50 + 30 + 10                                   | 400                                                                                                                                                                   |
| 3.17 | ✅ Payment milestones summing to 100      | 30 + 40 + 30                                   | Saved                                                                                                                                                                 |
| 3.18 | ⚠️ Property already has accepted quote   | Pick property whose another quote was accepted | Cannot create new quote (property locked) — verify via `GET /quotes/property-lock-status?propertyId=` returns `locked: true`                                          |
| 3.19 | ✅ BOM auto-created on save               | After save                                     | `GET /bom?entityType=quote_version&entityId=<versionId>` returns rows; serialized types (panel/inverter/battery) exploded into per-unit rows; structure as single row |
| 3.20 | ⚠️ BOM creation failure                  | Force a missing product mid-save               | Quote still saves; warning logged                                                                                                                                     |


### 3.C Quote list & detail


| #    | Scenario                     | Steps                    | Expected Result                                   |
| ---- | ---------------------------- | ------------------------ | ------------------------------------------------- |
| 3.21 | ✅ List page filter by status | Drafts / Sent / Accepted | Filtered list correct                             |
| 3.22 | ✅ Pagination                 | Use page sizes 10/25/100 | Correct paging                                    |
| 3.23 | 🧪 Search < 2 chars          | Type "a"                 | No filter applied (min 2)                         |
| 3.24 | ✅ Detail Overview tab        | Open quote               | Shows pricing, items, validity badge              |
| 3.25 | ⚠️ Expired badge             | Set `validUntil` to past | "Expired" badge in header (does NOT block accept) |
| 3.26 | ✅ Download PDF               | From overview            | PDF downloads via html2pdf                        |


---

## Section 4 — Quote Status Transitions (FSM)

### 4.A Allowed transitions


| #   | From      | Action                    | Required input             | Expected                                                                                              |
| --- | --------- | ------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| 4.1 | 🔁 draft  | Send                      | none                       | Status `sent`; `acceptedAt` null                                                                      |
| 4.2 | 🔁 sent   | Accept                    | `customerSignature` (text) | Status `accepted`; `acceptedAt` now; `acceptedByCustomerSignature` saved                              |
| 4.3 | 🔁 sent   | Reject                    | `rejectionReason`          | Status `rejected`; reason saved                                                                       |
| 4.4 | 🔁 sent   | Mark Expired (admin/cron) | none                       | Status `expired` (note: UI dropdown does not expose this; only via `markExpiredQuotes()` server-side) |
| 4.5 | 🔁 viewed | Accept/Reject/Expire      | as above                   | Allowed (viewed exists in backend FSM)                                                                |


### 4.B Disallowed transitions


| #    | From → To              | Steps                             | Expected                   |
| ---- | ---------------------- | --------------------------------- | -------------------------- |
| 4.6  | ⚠️ draft → accepted    | Try direct accept on draft        | 400 transition not allowed |
| 4.7  | ⚠️ draft → rejected    | Same                              | 400                        |
| 4.8  | ⚠️ accepted → anything | Try to send/reject accepted quote | 400 (terminal)             |
| 4.9  | ⚠️ rejected → draft    | Try revive                        | 400 (terminal)             |
| 4.10 | ⚠️ expired → anything  | Same                              | 400                        |


### 4.C Required-field rules


| #    | Scenario                              | Steps                                                                               | Expected                                                                                            |
| ---- | ------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 4.11 | 🧪 Accept without signature           | Submit accept dialog blank                                                          | 400: customerSignature required                                                                     |
| 4.12 | 🧪 Reject without reason              | Submit reject dialog blank                                                          | 400: rejectionReason required                                                                       |
| 4.13 | ⚠️ Property lock during status change | Two quotes Q1 (accepted), Q2 (sent) on same property — try to change Q2 to anything | 400: "Another quote for this property has already been accepted..."                                 |
| 4.14 | ⚠️ Accept past `validUntil`           | Quote validUntil yesterday, status `sent`                                           | Acceptance still succeeds (no validUntil check on accept) — confirm and document expected behaviour |


### 4.D Re-quote flow after rejection


| #    | Scenario                           | Steps                                                | Expected                                                              |
| ---- | ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| 4.15 | ✅ Create new quote after rejection | Reject Q1, then click "Create New Quote" on detail   | Routed to `/quotes/new?customerId=&propertyId=`; new quote created OK |
| 4.16 | ⚠️ Cannot create after acceptance  | After Q1 accepted on property, try to create another | Property lock prevents creation                                       |


---

## Section 5 — Quote → Project Conversion

**API:** `POST /api/v1/projects/convert-from-quote/:quoteId`

### 5.A Pre-conditions


| #   | Scenario                               | Steps                                        | Expected                                                                              |
| --- | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| 5.1 | ⚠️ Convert non-accepted quote          | Try convert from `draft`/`sent`/`rejected`   | 400/422 — quote must be accepted                                                      |
| 5.2 | ⚠️ Convert quote without propertyId    | (data fixture)                               | 400 — propertyId required                                                             |
| 5.3 | ⚠️ Property already converted          | Re-convert                                   | Blocked — property `status === converted`                                             |
| 5.4 | ⚠️ Project already exists for property | Run convert twice                            | Second call rejected — one project per property                                       |
| 5.5 | ✅ Convert happy path                   | Click "Convert to Project" on accepted quote | Project created in `draft`; redirected to project detail; property `status=converted` |


### 5.B What is carried over


| #    | Scenario                                        | Steps                                                                                   | Expected                                                                                         |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 5.6  | ✅ Project links to quote & property             | Open project                                                                            | `quoteId`, `propertyId` set; customer info shown via property relation                           |
| 5.7  | ✅ Default name                                  | Don't pass `name`                                                                       | `{customerName} - {systemSizeKw}kW Solar Installation`                                           |
| 5.8  | ✅ Custom `name`, `description`, `priority`      | Pass via wizard                                                                         | Persisted on project                                                                             |
| 5.9  | ✅ Milestones from `paymentMilestones`           | Quote had stages mat_proc, install_start, install_complete, commissioning, net_metering | Milestones created with mapped `MilestoneType`; statuses `pending`                               |
| 5.10 | ✅ Custom milestones override                    | Wizard supplies `milestones`                                                            | Used instead of payment ones                                                                     |
| 5.11 | ✅ Workflow tasks created                        | Active workflow steps                                                                   | Tasks created and linked to milestones                                                           |
| 5.12 | ✅ Excluded steps respected                      | Set `excludedStepIds`                                                                   | Those tasks not created                                                                          |
| 5.13 | ✅ Team members added                            | Provide `projectManagerId` + `teamMembers[]`                                            | Team rows created; PM marked                                                                     |
| 5.14 | ⚠️ Same user as PM and in `teamMembers[]`       | Provide overlap                                                                         | Second add is skipped; no duplicate; no error                                                    |
| 5.15 | ⚠️ Task assignee not in team                    | `taskAssignments` references user not on team                                           | 400 BadRequestException                                                                          |
| 5.16 | ⚠️ Duplicate workflow step in `taskAssignments` | Same stepId twice                                                                       | 400 duplicate step                                                                               |
| 5.17 | ✅ BOM cloned to project                         | After convert                                                                           | `GET /bom?entityType=project&entityId=<projectId>` returns rows; serial numbers cleared on clone |
| 5.18 | ⚠️ BOM clone fails (missing source BOM)         | Edge case                                                                               | Project still created; warn logged                                                               |
| 5.19 | 🔒 Convert quote of another org                 | API call with foreign quoteId                                                           | 404                                                                                              |


---

## Section 6 — Project Management

### 6.A Status transitions


| #   | From → To                            | Side-effects                              | Expected       |
| --- | ------------------------------------ | ----------------------------------------- | -------------- |
| 6.1 | 🔁 draft → planning                  | none                                      | OK             |
| 6.2 | 🔁 planning → approved               | none                                      | OK             |
| 6.3 | 🔁 approved → in_progress            | sets `startDate` if missing               | OK             |
| 6.4 | 🔁 in_progress → completed           | sets `endDate` + `progressPercentage=100` | OK             |
| 6.5 | 🔁 in_progress → on_hold             | none                                      | OK             |
| 6.6 | ⚠️ draft → in_progress (skip)        | direct                                    | 400            |
| 6.7 | ⚠️ completed → anything              | direct                                    | 400 (terminal) |
| 6.8 | ⚠️ cancelled → anything              | direct                                    | 400 (terminal) |
| 6.9 | 🔁 on_hold → in_progress / cancelled | both                                      | OK             |


### 6.B Delete


| #    | Scenario                        | Expected                                    |
| ---- | ------------------------------- | ------------------------------------------- |
| 6.10 | ⚠️ Delete `in_progress` project | Blocked — only `draft` or `cancelled`       |
| 6.11 | ✅ Delete `draft` project        | Soft-deleted; property restored to `active` |


### 6.C Detail tabs (verify each loads, empty state, error state)


| #    | Tab                | Expected                                                                          |
| ---- | ------------------ | --------------------------------------------------------------------------------- |
| 6.12 | Overview           | Team panel, summary cards visible                                                 |
| 6.13 | Summary            | Metrics & workload                                                                |
| 6.14 | Tasks              | Kanban/list; assignees pulled from team                                           |
| 6.15 | Documents          | Upload/list works                                                                 |
| 6.16 | Payments           | Milestone payments visible                                                        |
| 6.17 | BOM & Inventory    | Grouped table; serialized rows expandable                                         |
| 6.18 | Units & Serials    | Bulk paste field; per-row inputs; placeholders for Dispatched/Installed (Pending) |
| 6.19 | Allocations        | Empty state when no allocations; create dialog opens                              |
| 6.20 | Reports            | Loads                                                                             |
| 6.21 | Surveys            | Loads against `propertyId`                                                        |
| 6.22 | Invalid `?tab=foo` | Falls back to Overview                                                            |


### 6.D Project team


| #    | Scenario                                | Steps                                          | Expected                                                                                    |
| ---- | --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 6.23 | ✅ Add member                            | `POST /projects/:id/team` `{userId, roleName}` | Created                                                                                     |
| 6.24 | ⚠️ Add same user twice                  | Repeat                                         | 400 / unique constraint hit                                                                 |
| 6.25 | ✅ Set new PM                            | PATCH member with `isProjectManager=true`      | Previous PM flag cleared; only one PM                                                       |
| 6.26 | ⚠️ Remove last PM                       | Delete the only PM                             | **Allowed** (no guard) — confirm and document; project may then need admin bypass to manage |
| 6.27 | 🔒 Non-team user accesses team routes   | Login as non-member, non-admin user            | 403 from `ProjectTeamGuard`                                                                 |
| 6.28 | 🔒 Admin / super_admin / platform_admin | Login as admin                                 | Bypass team guard                                                                           |


---

## Section 7 — BOM & Serial Numbers

### 7.A View / structure


| #   | Scenario                     | Expected                                                                                          |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| 7.1 | ✅ View quote BOM             | `GET /bom?entityType=quote_version&entityId=...` returns header + items                           |
| 7.2 | ✅ View project BOM           | `GET /bom?entityType=project&entityId=...`                                                        |
| 7.3 | ✅ Serialized panels exploded | Quote with quantity 8 panels → 8 rows with shared `groupKey`, `unitIndex` 1..8, `quantity=1` each |
| 7.4 | ✅ Structure not exploded     | quantity > 1 stays single line                                                                    |
| 7.5 | 🧪 Invalid `entityType`      | `?entityType=foo`                                                                                 |


### 7.B Serial update — single (`PATCH /bom-items/:id/serial`)


| #    | Scenario                                                        | Body                                                   | Expected                                    |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| 7.6  | ✅ Update serial of panel unit                                   | `{ serialNumber: "ABC-123" }`                          | 200; serial saved                           |
| 7.7  | ✅ Clear serial                                                  | `{ serialNumber: null }`                               | Serial cleared                              |
| 7.8  | ✅ Empty string treated as null                                  | `{ serialNumber: " " }`                                | Cleared                                     |
| 7.9  | 🧪 Invalid chars                                                | `"ABC#$%"`                                             | 400 — fails regex `^[A-Za-z0-9\-_\/]+$`     |
| 7.10 | 🧪 > 100 chars                                                  | 101-char string                                        | 400                                         |
| 7.11 | ⚠️ Duplicate serial within same BOM                             | Same serial on two units                               | 409 conflict (partial unique index)         |
| 7.12 | ✅ Same serial across different BOMs                             | Allowed                                                | Saves OK                                    |
| 7.13 | ⚠️ Update serial on non-serializable type (e.g. mounting/cable) | PATCH                                                  | 400 — `ensureSerializableItemType` rejects  |
| 7.14 | 🔒 Role check                                                   | Login as user without `admin`/`manager`/`field_worker` | 403 (extra role gate beyond `bom:finalize`) |
| 7.15 | 🔒 No `bom:finalize` permission                                 | Strip permission                                       | 403                                         |


### 7.C Serial update — bulk (`PATCH /bom-items/bulk-serials`)


| #    | Scenario                       | Body                  | Expected                                      |
| ---- | ------------------------------ | --------------------- | --------------------------------------------- |
| 7.16 | ✅ Bulk apply 8 unique serials  | `{items:[...8...]}`   | All updated                                   |
| 7.17 | ⚠️ One duplicate in batch      | Two items same serial | 409; transaction rollback (verify none saved) |
| 7.18 | ⚠️ Mix of valid + invalid char | One bad regex         | 400; rollback                                 |


### 7.D Serial check (`GET /bom-items/check-serial?serialNumber=`)


| #    | Scenario               | Expected              |
| ---- | ---------------------- | --------------------- |
| 7.19 | ✅ Conflict-free serial | Returns no conflicts  |
| 7.20 | ⚠️ Existing serial     | Returns conflict info |


### 7.E UI — Project BOM tab


| #    | Scenario                     | Expected                                                      |
| ---- | ---------------------------- | ------------------------------------------------------------- |
| 7.21 | ✅ Type serial in field, blur | Saves via `useUpdateBomItemSerial`; row shows saved indicator |
| 7.22 | ⚠️ Server returns 409        | Toast error; field shows last good value                      |


### 7.F UI — Project Units & Serials tab


| #    | Scenario                           | Expected                                            |
| ---- | ---------------------------------- | --------------------------------------------------- |
| 7.23 | ✅ Bulk paste serials (CSV/newline) | Click Apply; matches by row order; saves all        |
| 7.24 | ✅ Export CSV                       | CSV downloads with rows                             |
| 7.25 | 🧪 Dispatched / Installed columns  | Show "Pending" badges (placeholder) — not wired yet |


---

## Section 8 — BOM Finalize & Allocate (Project ↔ Inventory)

**API:** `POST /api/v1/bom/:id/finalize-and-allocate` body `{ warehouseId }`


| #   | Scenario                         | Steps                                                       | Expected                                                                                                |
| --- | -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 8.1 | ✅ Finalize with sufficient stock | Pick warehouse with stock ≥ each productId's required qty   | BOM status → `allocated`; `StockAllocation` rows created per productId with `projectId` & `warehouseId` |
| 8.2 | ⚠️ Insufficient stock            | Less than needed                                            | 400 with descriptive shortfall                                                                          |
| 8.3 | ⚠️ BOM already `allocated`       | Re-trigger                                                  | Idempotent — no duplicate allocations                                                                   |
| 8.4 | ⚠️ Wrong entityType              | Run on quote BOM                                            | 400 — only `project` BOMs                                                                               |
| 8.5 | ⚠️ Missing warehouseId           | Empty body                                                  | 400                                                                                                     |
| 8.6 | 🔒 Different org warehouse       | Send foreign warehouseId                                    | 4xx                                                                                                     |
| 8.7 | ✅ Verify allocations on project  | Allocations tab shows new rows; `allocatedQuantity` matches |                                                                                                         |


---

## Section 9 — Vendor Management

### 9.A Create


| #    | Scenario                     | Steps                                    | Expected       |
| ---- | ---------------------------- | ---------------------------------------- | -------------- |
| 9.1  | ✅ Create vendor minimal      | `name`, `code`                           | Created        |
| 9.2  | 🧪 Missing name / code       | Blank                                    | 400            |
| 9.3  | 🧪 GSTIN length ≠ 15         | 14-char value                            | 400            |
| 9.4  | 🧪 PAN length ≠ 10           | 9-char value                             | 400            |
| 9.5  | 🧪 IFSC length ≠ 11          | 10-char value                            | 400            |
| 9.6  | 🧪 Phone length out of 10–20 | 9 digits                                 | 400            |
| 9.7  | 🧪 Pincode out of 6–10       | 5 chars                                  | 400            |
| 9.8  | 🧪 Rating > 5                | 6                                        | 400            |
| 9.9  | ⚠️ Duplicate code in org     | Re-use existing code                     | 400 / conflict |
| 9.10 | ✅ Same code across orgs      | Different org                            | OK             |
| 9.11 | 🧪 vendorType all 3 values   | supplier / contractor / service_provider | All accepted   |


### 9.B Edit / status / delete


| #    | Scenario                                           | Steps                                                           | Expected                                                |
| ---- | -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| 9.12 | ✅ Edit vendor                                      | PATCH name/contact                                              | Saves                                                   |
| 9.13 | ⚠️ Change code to duplicate                        | PATCH code to other vendor's code                               | 400                                                     |
| 9.14 | ✅ Change status active → inactive                  | PATCH `:id/status`                                              | Saves                                                   |
| 9.15 | ✅ Status → blacklisted                             | PATCH                                                           | Saves                                                   |
| 9.16 | 🧪 Invalid status enum                             | `?status=foo`                                                   | 400 (ParseEnumPipe)                                     |
| 9.17 | ⚠️ Delete with active POs                          | Vendor has PO in `draft`/`approved`/`sent`/`partially_received` | 400: `Cannot delete vendor with active purchase orders` |
| 9.18 | ✅ Delete after all POs cancelled or fully received | Soft delete succeeds                                            | Vendor disappears from list                             |
| 9.19 | 🔒 Delete vendor of another org                    | Foreign id                                                      | 404                                                     |
| 9.20 | ✅ Vendor stats summary                             | `GET /vendors/stats/summary`                                    | Returns counts                                          |


---

## Section 10 — Warehouse Management

### 10.A Create / edit


| #    | Scenario                     | Steps                           | Expected                                          |
| ---- | ---------------------------- | ------------------------------- | ------------------------------------------------- |
| 10.1 | ✅ Create warehouse minimal   | `name`, `code`                  | Created with `warehouseType=own`, `status=active` |
| 10.2 | ⚠️ Duplicate code in org     | Re-use                          | 400                                               |
| 10.3 | 🧪 Pincode out of 6–10       | 5 chars                         | 400                                               |
| 10.4 | 🧪 Phone length out of 10–20 | 9 digits                        | 400                                               |
| 10.5 | ✅ Set type `third_party`     | Save                            | Persisted                                         |
| 10.6 | ✅ Coordinates set            | Provide lat/long                | Saved as JSONB                                    |
| 10.7 | ✅ Assign manager             | `warehouseManagerId` valid UUID | Saved                                             |
| 10.8 | ⚠️ Invalid manager UUID      | Random UUID                     | 4xx                                               |


### 10.B Status / delete


| #     | Scenario                      | Expected                                                                                                    |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 10.9  | ✅ PATCH status → inactive     | OK                                                                                                          |
| 10.10 | 🧪 Invalid status             | 400                                                                                                         |
| 10.11 | ⚠️ Delete with stock          | Any product with `availableQuantity` / `reservedQuantity` / `inTransitQuantity > 0`                         |
| 10.12 | ✅ Delete empty warehouse      | All zeros                                                                                                   |
| 10.13 | ⚠️ "Active warehouses" filter | `getActiveWarehouses` returns only `WarehouseType.OWN` (regardless of `status`) — verify behaviour vs label |


---

## Section 11 — Products / SKU (Master Data)


| #    | Scenario                     | Steps                                      | Expected                                                    |
| ---- | ---------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| 11.1 | ✅ Create product             | `productTypeId`, `brandId`, `name`, `code` | Created with `status=active`, `unitOfMeasure=pcs` (default) |
| 11.2 | ⚠️ Duplicate code (org)      | Same code                                  | 409 conflict                                                |
| 11.3 | 🧪 name > 255                | Long string                                | 400                                                         |
| 11.4 | ✅ Status enum                | active / inactive / discontinued           | All saved                                                   |
| 11.5 | ✅ Unit enum                  | pcs/mtr/kg/set/box/roll                    | All saved                                                   |
| 11.6 | 🔒 List filter scoped to org | Only org's products visible                |                                                             |


---

## Section 12 — Purchase Orders

**Routes:** `apps/web/.../inventory/components/inventory-purchase-orders-page.tsx`

### 12.A Create / update / delete


| #    | Scenario                                          | Steps                          | Expected                                               |
| ---- | ------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| 12.1 | ✅ Create PO with vendor + warehouse + items       | Use Create PO page             | PO saved as `draft`, `paymentStatus=pending`           |
| 12.2 | 🧪 Missing vendorId                               | Submit without vendor          | 400                                                    |
| 12.3 | 🧪 Missing items                                  | Empty items                    | 400                                                    |
| 12.4 | ⚠️ Server ignores client `subtotal`/`totalAmount` | Compare submitted vs persisted | Persisted = computed from line items + DTO `taxAmount` |
| 12.5 | ✅ Update PO in `draft`                            | PATCH                          | OK                                                     |
| 12.6 | ⚠️ Update PO in `sent`                            | PATCH                          | 400 — only draft/pending_approval editable             |
| 12.7 | ✅ Delete PO in `draft`                            | DELETE                         | Hard-deletes lines + soft-deletes PO                   |
| 12.8 | ⚠️ Delete PO in any other state                   | DELETE                         | 400                                                    |


### 12.B FSM


| #     | From → To                                                                         | Action                                                                      | Permission                                        | Expected                |
| ----- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------- |
| 12.9  | 🔁 draft → pending_approval                                                       | Submit                                                                      | `purchase-order:submit`                           | OK                      |
| 12.10 | 🔁 pending_approval → approved                                                    | Approve                                                                     | `purchase-order:approve`                          | OK                      |
| 12.11 | 🔁 approved → sent                                                                | Send                                                                        | `purchase-order:send` (or `purchase-order:write`) | OK                      |
| 12.12 | 🔁 sent / approved / confirmed / partially_received → received/partially_received | Receive                                                                     | `purchase-order:receive`                          | See receive rules below |
| 12.13 | ⚠️ Cancel after `received` or `partially_received`                                | Cancel                                                                      | `purchase-order:write`                            | 400 — blocked           |
| 12.14 | ⚠️ confirmed status                                                               | No service method sets `confirmed` — verify product behaviour, document gap |                                                   |                         |


### 12.C Receive


| #     | Scenario                        | Steps                                                      | Expected                                                                                                                                        |
| ----- | ------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.15 | ⚠️ Receive PO without warehouse | PO created without warehouse                               | 400: `Purchase order must have a warehouse assigned`                                                                                            |
| 12.16 | ✅ Partial receive               | Receive 5 of 10                                            | Status `partially_received`; stock increased by 5                                                                                               |
| 12.17 | ✅ Full receive                  | Receive remaining                                          | Status `received`                                                                                                                               |
| 12.18 | ⚠️ Over-receive                 | currentReceived + new > ordered                            | 400: `Received quantity cannot exceed ordered quantity`                                                                                         |
| 12.19 | ✅ Stock transaction created     | After receive                                              | `inventory_transactions` row with `transactionType=purchase`, `referenceType=purchase_order`, `referenceId=<poId>`; warehouse stock incremented |
| 12.20 | ⚠️ `quantityRejected` provided  | Currently not applied to stock                             | Verify documented gap; rejection has no stock effect                                                                                            |
| 12.21 | ⚠️ `grnNumber` provided         | Currently not persisted by service — verify documented gap |                                                                                                                                                 |
| 12.22 | ✅ `actualDeliveryDate` set      | After receive                                              | Equals `receivingDate` (or now)                                                                                                                 |


### 12.D Payment


| #     | Scenario                          | Steps              | Expected                                         |
| ----- | --------------------------------- | ------------------ | ------------------------------------------------ |
| 12.23 | ✅ Record partial payment          | Amount < total     | `paymentStatus=partial`; `paidAmount` increments |
| 12.24 | ✅ Record final payment            | Amount = remaining | `paymentStatus=paid`                             |
| 12.25 | ⚠️ Payment ≤ 0                    | Zero or negative   | 400                                              |
| 12.26 | ⚠️ Payment > remaining            | Over-pay           | 400                                              |
| 12.27 | ⚠️ Payment on `draft`/`cancelled` | Try                | 400                                              |
| 12.28 | ⚠️ Payment when already `paid`    | Try                | 400                                              |


### 12.E UI page (purchase orders)


| #     | Scenario                           | Expected                                                                      |
| ----- | ---------------------------------- | ----------------------------------------------------------------------------- |
| 12.29 | ✅ Toolbar Create PO                | Visible only with `purchase-order:write`                                      |
| 12.30 | ✅ Export CSV button                | Visible with `inventory:export` or `inventory:read`                           |
| 12.31 | ✅ SavedViewsBar                    | Save/apply views works for `purchase-orders` resource                         |
| 12.32 | ✅ Filters                          | status, payment, vendor, warehouse — server filtering applied                 |
| 12.33 | ✅ Search                           | server-side; debounced                                                        |
| 12.34 | ✅ Pagination/sort                  | Server-driven                                                                 |
| 12.35 | ✅ Row menu → Approve               | Visible only when `pending_approval` + `purchase-order:approve` (or `:write`) |
| 12.36 | ✅ Row menu → Send                  | Visible only when `approved` or `confirmed` + `purchase-order:write`          |
| 12.37 | ✅ Row menu → Cancel                | Hidden for `received`/`cancelled`                                             |
| 12.38 | ✅ Row click → detail               | Navigates to PO detail                                                        |
| 12.39 | 🔒 Different org PO via direct URL | 404                                                                           |


### 12.F Bulk operations


| #     | Scenario       | Permission                                                                     | Expected                                     |
| ----- | -------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| 12.40 | ✅ Bulk approve | `purchase-order:approve`                                                       | All eligible flipped                         |
| 12.41 | ✅ Bulk cancel  | `purchase-order:write` (note: not `purchase-order:cancel` — seeded but unused) | Eligible cancelled; rest skipped with reason |


---

## Section 13 — Stock Management & Movement

### 13.A Stock update


| #    | Scenario                      | Steps                                            | Expected                            |
| ---- | ----------------------------- | ------------------------------------------------ | ----------------------------------- |
| 13.1 | ✅ Update stock + delta        | `POST /inventory-stock/update` with positive qty | Stock increases; transaction logged |
| 13.2 | ⚠️ Negative result            | Delta would push below 0                         | 400: `Insufficient stock available` |
| 13.3 | 🧪 Required `transactionType` | Missing                                          | 400                                 |
| 13.4 | 🔒 Different org warehouse    | 4xx                                              |                                     |


### 13.B Transfer


| #    | Scenario                  | Steps           | Expected                                                                                                |
| ---- | ------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| 13.5 | ✅ Transfer A→B            | Sufficient at A | Two transactions: `transfer_out` from A, `transfer_in` to B; both reference each other's warehouse UUID |
| 13.6 | ⚠️ Insufficient at source | Same            | 400                                                                                                     |
| 13.7 | ⚠️ Same source & dest     | A→A             | 400                                                                                                     |


### 13.C Adjust


| #     | Scenario             | Steps                   | Expected                     |
| ----- | -------------------- | ----------------------- | ---------------------------- |
| 13.8  | ✅ Adjust upward      | `newQuantity` > current | Delta logged as `adjustment` |
| 13.9  | ✅ Adjust downward    | `newQuantity` < current | Negative delta logged        |
| 13.10 | 🧪 Adjust below zero | `newQuantity = -1`      | 400 (`@Min(0)`)              |


### 13.D Transactions ledger


| #     | Scenario                                                   | Expected                     |
| ----- | ---------------------------------------------------------- | ---------------------------- |
| 13.11 | ✅ Filter by type/warehouse/product/dates                   | Returns matching rows        |
| 13.12 | ✅ Filter by `referenceType=purchase_order` + `referenceId` | Returns receipts for that PO |


---

## Section 14 — Stock Allocations & Dispatches

### 14.A Allocation


| #    | Scenario                     | Steps                                                              | Expected                                                        |
| ---- | ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| 14.1 | ✅ Create allocation          | `POST /stock-allocations` with project + warehouse + product + qty | Status `allocated`; reserved stock incremented                  |
| 14.2 | 🧪 allocatedQuantity < 0.001 | 0                                                                  | 400                                                             |
| 14.3 | ⚠️ Insufficient available    | Reserve more than available                                        | 400                                                             |
| 14.4 | ✅ Fulfil allocation          | `POST :id/fulfill`                                                 | Quantities update; status moves toward `dispatched`/`completed` |
| 14.5 | ✅ Cancel allocation          | `POST :id/cancel`                                                  | Status `cancelled`; stock released back to available            |
| 14.6 | ✅ Return allocation          | `POST :id/return`                                                  | Returned qty increments                                         |
| 14.7 | ✅ Bulk cancel allocations    | Bulk endpoint                                                      | Eligible cancelled                                              |
| 14.8 | ✅ Allocations by project     | `GET project/:projectId`                                           | Filtered list                                                   |
| 14.9 | ✅ Pending list               | `GET pending/list`                                                 | Returns active allocations                                      |


### 14.B Dispatch (high-level)


| #     | Scenario                                          | Expected                               |
| ----- | ------------------------------------------------- | -------------------------------------- |
| 14.10 | ✅ Create dispatch from allocation                 | Status `prepared`                      |
| 14.11 | 🔁 prepared → dispatched → in_transit → delivered | Each requires `dispatch:write`         |
| 14.12 | ⚠️ Cancel after delivered                         | Blocked                                |
| 14.13 | ✅ Bulk cancel                                     | Eligible cancelled                     |
| 14.14 | ✅ Stock effect on dispatch                        | `removeStock` with `DISPATCH` txn type |


---

## Section 15 — Cross-flow Integration Tests (do this end-to-end after individual sections pass)


| #    | Scenario                                           | Steps                                                                                                                                                 | Expected                                                                               |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 15.1 | ✅ Full happy path                                  | Customer → Property → Calculate → Save Quote → Send → Accept → Convert to Project → Add Team → Edit Serials → Finalize & Allocate from Warehouse      | All steps succeed; property `converted`; project visible with BOM, team, allocations   |
| 15.2 | ⚠️ Re-quote after rejection                        | Reject Q1 → Create Q2 on same property → Accept Q2 → Convert                                                                                          | Q2 conversion works; Q1 stays rejected                                                 |
| 15.3 | ⚠️ Lock after acceptance                           | Accept Q1 on property; try to send/accept/reject Q2 on same property                                                                                  | Status changes blocked: "Another quote for this property has already been accepted..." |
| 15.4 | ⚠️ Convert blocked when property already converted | Try second conversion                                                                                                                                 | 400/409                                                                                |
| 15.5 | ⚠️ PO ↔ Stock ↔ Allocation chain                   | Create PO → Receive (stock +) → Create Project & BOM → Finalize-and-allocate (reserved +) → Cancel allocation (released) → Verify counts at each step | All quantities accounting balances; transactions ledger shows full trail               |
| 15.6 | 🔒 Org isolation across the whole flow             | Repeat key actions while logged into Org B with Org A IDs                                                                                             | Every cross-org access returns 404 / 403                                               |


---

## Section 16 — Permissions Matrix Spot Checks

For each role group, verify access:


| Action                                          | Required permission                                            | Test                  |
| ----------------------------------------------- | -------------------------------------------------------------- | --------------------- |
| List vendors / warehouses / POs / stock         | `inventory:read`                                               | User without it → 403 |
| Create/update vendor / warehouse / stock update | `inventory:write`                                              | 403 without           |
| Stock transfer                                  | `stock:transfer`                                               | 403 without           |
| Stock adjust                                    | `stock:adjust`                                                 | 403 without           |
| PO create/update/delete/cancel/record-payment   | `purchase-order:write`                                         | 403 without           |
| PO submit                                       | `purchase-order:submit`                                        | 403 without           |
| PO approve (incl. bulk)                         | `purchase-order:approve`                                       | 403 without           |
| PO send                                         | `purchase-order:send` (or `:write`)                            | 403 without either    |
| PO receive                                      | `purchase-order:receive`                                       | 403 without           |
| Allocation CUD/fulfil/cancel/return             | `allocation:write`                                             | 403 without           |
| Dispatch CUD                                    | `dispatch:write`                                               | 403 without           |
| BOM read                                        | `bom:read`                                                     | 403 without           |
| BOM finalize / serial PATCH                     | `bom:finalize` **AND** role ∈ `admin`/`manager`/`field_worker` | 403 if either missing |
| Inventory export CSV                            | `inventory:export` or `inventory:read`                         | 403 without both      |
| Saved views                                     | `saved-view:read` / `saved-view:write`                         | 403 without           |


---

## Section 17 — Negative & Boundary Mega-list (don't skip)


| #     | Area        | Scenario                                        | Expected                                                                |
| ----- | ----------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 17.1  | Auth        | Expired JWT mid-flow                            | 401; client refreshes token; user not blocked                           |
| 17.2  | Auth        | No JWT                                          | 401 on every protected route                                            |
| 17.3  | Validation  | Whitespace-only required strings                | Rejected as empty                                                       |
| 17.4  | Validation  | Unicode / emoji in names                        | Accepted up to length limit                                             |
| 17.5  | Validation  | SQL-injection-like values                       | Stored verbatim; no breakage                                            |
| 17.6  | Concurrency | Two users approve same PO simultaneously        | One succeeds; other gets stale-state error                              |
| 17.7  | Concurrency | Two clients accept same quote at once           | Only one acceptance persists                                            |
| 17.8  | Concurrency | Two clients PATCH same BOM serial to same value | One succeeds; other gets 409                                            |
| 17.9  | Soft-delete | Deleted customer's phone reused                 | New customer creation succeeds (deleted record ignored by uniqueness)   |
| 17.10 | Soft-delete | Deleted entity not returned in GET / list       | Verify across all resources                                             |
| 17.11 | Pagination  | `limit=0` or `limit=10000`                      | `limit > 100` rejected (Quote query); other limits clamp/reject per DTO |
| 17.12 | Search      | `search` 1 char                                 | Ignored (min 2) on Quote list                                           |
| 17.13 | UI          | Rapid double-click Submit                       | Only one request fires (button disabled)                                |
| 17.14 | UI          | Browser back during multi-step wizard           | State preserved or re-prompts cleanly                                   |
| 17.15 | PDF         | PDF download under network failure              | Toast error; no broken file                                             |
| 17.16 | Files       | Property document upload > size limit           | Backend rejects; UI shows error                                         |
| 17.17 | Files       | Unsupported file type                           | Rejected                                                                |


---

## Section 18 — Sign-off checklist (manual)

- Section 1 (Customer) — all rows pass
- Section 2 (Property) — all rows pass
- Section 3 (Quote create) — all rows pass
- Section 4 (Quote FSM) — all rows pass
- Section 5 (Conversion) — all rows pass
- Section 6 (Project) — all rows pass
- Section 7 (BOM serials) — all rows pass
- Section 8 (Finalize-and-allocate) — all rows pass
- Section 9 (Vendor) — all rows pass
- Section 10 (Warehouse) — all rows pass
- Section 11 (Products) — all rows pass
- Section 12 (PO) — all rows pass
- Section 13 (Stock movements) — all rows pass
- Section 14 (Allocation/Dispatch) — all rows pass
- Section 15 (End-to-end integration) — all rows pass
- Section 16 (Permissions) — all rows pass
- Section 17 (Negative / boundary) — all rows pass

---

## Notes & known gaps to flag during testing

These are confirmed in code but worth flagging to engineering during QA:

1. **Frontend ≠ Backend strictness** — backend `CreateCustomerDto` allows missing last name, city, state, etc. Direct API clients can create sparser customers than the web form allows.
2. **Quote `valid_until`** is **not** checked when accepting a quote — past-date quotes can still be accepted. Confirm if this is intended.
3. **Quote `viewed` status** is supported in backend FSM but UI never transitions to it.
4. `**markExpiredQuotes()`** exists in service but has no caller in repo — auto-expiry depends on external cron.
5. **PO `confirmed` status** is reachable via FSM ingress in `receive()` but no service path sets it — likely external/manual.
6. **PO `quantityRejected`** and `**grnNumber**` in receive DTO are not persisted/applied by service.
7. **Last project manager removal** is allowed (no guard) — project may become un-manageable to non-admins until a new PM is added.
8. `**getActiveWarehouses`** returns own-type warehouses regardless of `status` — name is misleading.
9. **Project Units & Serials tab** "Dispatched"/"Installed" columns are static "Pending" placeholders.
10. `**purchase-order:cancel`** permission is seeded but bulk-cancel uses `purchase-order:write`.
11. `**inventory:bulk`** permission seeded but unused.
12. **Group code failure after customer save** — customer is already persisted when invalid group code throws 400 (partial state).

End of document.