# Report paperwork — one fact store, one workspace

Date: 2026-09-23
Branch: `feat/report-paperwork`
Status: approved in chat, awaiting spec review

## Why

The project Reports tab holds the DISCOM paperwork (WCR, DCR, Net Metering
Agreement, Annexure Proforma A). Today every report is its own island:

- Each report has its own mapper and its own saved copy of every field, in
  `documents.metadata.reportFields`. A fact that two reports share (consumer
  name, sanction number, capacity) is typed and stored once per report.
- A saved report never learns that its facts changed. A filed WCR keeps an old
  inverter after the BOM changes, and nothing says so.
- Nothing outside the project says a report is still to file.
- The client sent 10 WCR corrections (below).

The client can wait for one build. The goal is no rework: fix the WCR inside
the new model, not before it.

## Goals

1. Every fact is entered once per project and used by every report that needs it.
2. System facts (customer, property, project, BOM, company) are read live, never
   copied, so they cannot drift.
3. A filed report knows when it is out of date.
4. Zero silent errors: bad input is refused at entry, a report with a missing
   required fact cannot be filed, and a PDF with the wrong page count is not saved.
5. Pending reports are visible on the projects list.
6. A new report is one definition plus one template, with no new screen code,
   when the facts it prints and its `DocumentTag` already exist. A new fact also
   needs a catalog entry (and a resolver line if it is read from live data); a
   new tag needs a `DocumentTag` enum value.
7. The 10 WCR corrections.

## Non-goals

- A page count for DCR, NMA and Annexure. `pages` is optional; only the WCR
  declares it now. The others can declare theirs once measured.
- Server-side PDF rendering. We keep the existing client `html2pdf.js` path and
  add a page-count guard.
- Blocking a workflow step on report status (discussed, deferred).
- Company-wide defaults for signatory facts (see Open items).
- The mobile apps. No mobile screen shows reports; the mobile lead form does not
  get Aadhaar.

## Model

### Facts (shared, `libs/shared/src/reports/facts/`)

A fact is one named piece of paperwork data:

```ts
interface ReportFact {
  key: FactKey;                 // 'consumer_name', 'sanction_number', …
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone' | 'year';
  group: FactGroup;             // vendor | consumer | sanction | system | installation | agreement | signatory
  source: FactSource;           // company | customer | property | project | bom | manual | fixed
  placeholder?: string;
  editAt?: 'customer' | 'property' | 'quote' | 'bom';  // where a system fact is changed
  fixedValue?: string;          // for source: fixed
}
```

- `REPORT_FACTS` is the one catalog. Every fact key used by any report is in it.
- `source: manual` facts are typed on the Reports tab and stored per project.
- Every other source is read-only on the Reports tab. The form shows the value
  and an "Edit" link to `editAt`. One fact, one home.
- `source: fixed` is a constant (HPD = "Not applicable").

### One name per fact

Today the same fact has several names. They collapse to one key, and the
templates are updated to use it:

| Fact key | Replaces |
| --- | --- |
| `site_address` | `site_address` (WCR), `consumer_address` (DCR, NMA), `address_of_installation` (Annexure) |
| `installed_capacity_kw` | `installed_capacity_kw`, `capacity_kw`, `re_installed_capacity_rooftop_kw` |
| `module_count` | `module_count`, `number_of_pv_modules`, `no_of_pv_modules` |
| `module_make` | `module_make`, `pv_module_make` |
| `module_wattage` | `module_wattage`, `pv_module_capacities` |
| `module_total_kw` | `total_capacity_kwp`, `module_capacity_kw` |
| `inverter_total_kw` | `inverter_rating`, `inverter_capacity` (WCR), `inverter_capacity_kw` |
| `site_city` | `location` (NMA), `district` (Annexure) |
| `site_state` | `state` |
| `consumer_phone` / `consumer_email` | `mobile_number` / `email` |
| `module_serial_numbers` | `pv_module_serial_numbers` |
| `consumer_name` | also `signatory_consumer_name` (NMA): the consumer on the bill signs |
| `agreement_date` | `day`, `month`, `year` (NMA) |

### Report schema (shared)

```ts
interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  documentTag: DocumentTag;
  templateVersion: number;      // bump when wording or layout changes
  pages?: number;               // exact page count the PDF must have, when declared
  facts: Array<{ key: FactKey; required?: boolean }>;
}
```

`sections`, `fields`, `defineReportField`, the per-report `*_DEFAULT_FIELDS`,
`*ViewModel` types and `buildEmptyFields` go away.

### Resolver (backend, `apps/backend/src/modules/reports/facts/`)

One pure function replaces the four mappers:

```ts
resolveFacts(source: ReportSource): Record<FactKey, string>
interface ReportSource {
  project: ProjectEntity;            // with property, property.customer, latest quote version
  panelSerials: string[];           // sorted before use, so every path hashes the same
}
// manual facts are read from project.reportFacts
```

It holds the existing logic from the four mappers once: the joined multi-inverter
make/model string, summed inverter capacity, warranty string, `kW → Wp`, address
formatting, `customerDisplayName`. Being pure, the same function serves the
workspace endpoint and the projects-list batch.

### Manual fact store

New column `projects.report_facts jsonb NOT NULL DEFAULT '{}'`.
Keys are manual `FactKey`s, values are strings. A PATCH sends `null` to clear a
key (an omitted key is left alone).

### Status

Pure, shared: `getReportStatus(definition, facts, filed, currentHash)` returns one of

| Status    | Meaning                                                       |
| --------- | ------------------------------------------------------------- |
| `missing` | a required fact is empty; lists which                         |
| `ready`   | all required facts present, never filed                       |
| `filed`   | filed, and fingerprint + template version still match         |
| `stale`   | filed, but a fact it used changed or the template was revised |

Fingerprint: sha256 of the report's own facts, in definition order, stored on the
filed document as `metadata.factsHash` with `metadata.templateVersion` and
`metadata.reportFacts` (the values printed, for audit; the Aadhaar is stored
masked as `XXXX XXXX 1234`, while the fingerprint uses the full value). A document without a
fingerprint (filed before this change) is `stale`. That is correct: the vendor
legal name changes all four reports, and the WCR wording changes.

`pending` = `missing` + `ready` + `stale`. Only documents with category `report`
count as filed; a file uploaded by hand on the Documents tab with the same tag
does not.

## API (`/reports`)

All under `JwtAuthGuard`. `projects.edit` is enforced in the web, as it was for
the old drawer: without it, manual facts are read-only and Generate opens the
access dialog. The routes themselves check only the JWT.

| Route | Does |
| --- | --- |
| `GET /reports/projects/:projectId` | Workspace: every fact the catalog reports use (key, value, source, editable, editAt, usedBy[]) and every report (id, name, status, missing[], filedAt, documentId, fileUrl, pages). |
| `PATCH /reports/projects/:projectId/facts` | `{ facts: { [key]: string \| null } }`. Manual keys only, each validated by its fact rule. Rejects the whole request on any bad value. Returns the workspace. |
| `POST /reports/projects/:projectId/render` | `{ reportId }` → `{ html, pages, factsHash }` rendered from stored facts. No field values in the body: the server is the one source. |
| `POST /reports/projects/:projectId/file` | `{ reportId, file, factsHash }` → re-resolves facts, returns 409 ("<report> changed while it was being generated. Generate it again.") when the fingerprint differs from the rendered one, refuses if any required fact is missing, stores the document with fingerprint, purges the older copy (as today). |

Removed: `POST /reports/initialize`, `POST /reports/preview`, `POST /reports/save`,
`GET /reports/completeness`. Their callers move to the workspace endpoint.

## Web — the Reports tab

Replaces the drawer. Layout as approved in the chat mockup:

1. **Top bar**: pending pill · report picker (`All reports` / one report) ·
   `Preview` / `Edit details` toggle · `Generate` (label reads `Generate all`
   when "All reports" is picked).
2. **Status cards**, one per report: Missing N / Ready / Filed <date> / Out of
   date. Clicking a card picks that report. Filed cards offer Download.
3. **Facts form**, grouped by `group`, each fact once, a tag naming the reports
   that use it. Manual facts are inputs with inline validation; they save on blur
   (PATCH), and a field with an error is not sent. System facts show read-only
   with an Edit link. When one report is picked, the form shows only that
   report's facts.
4. **Preview mode**: form hidden, only the rendered report in one continuous
   frame. Page breaks exist only in the generated PDF, so a report that declares
   `pages` shows a sentence instead ("WCR must print on exactly 2 pages. Generate
   checks this and files nothing if it does not."); the page-count guard enforces it.
5. **Generate**: for each chosen report in `ready` or `stale`, in order:
   render → PDF → page-count check against `schema.pages` → upload → file.
   Generate is disabled while a fact save is in flight.
   `missing` reports are skipped and named. One failure does not stop the rest.
   A result list shows each report's outcome.

Page-count guard: build the PDF with `html2pdf().toPdf().get('pdf')` and read
`getNumberOfPages()`. On mismatch: no upload, error "WCR came out as 3 pages,
expected 2".

The overview Reports card and the tab badge read status from the workspace
endpoint.

## Projects list badge

`ReportsModule` already imports `ProjectsModule`, so `ProjectService.findAll`
cannot call into reports without a module cycle. The list asks separately:

`POST /reports/pending` `{ projectIds: string[] }` (max 100) → `{ [projectId]: number }`

- one query for the projects with property, customer and latest quote version
  (new `ProjectRepository.findByIdsForReports`),
- one query for filed report documents (`DocumentService.findByEntityBatch`),
- one query for panel serials (new `BomReadService.getPanelSerialsByProjects`),
- `resolveFacts` + `getReportStatus` per project in memory.

The web list sends the ids of the visible `active` and `completed` rows and
shows "N reports pending" next to the existing ticket chip. Planning, on-hold
and cancelled projects do not owe paperwork yet.

## WCR corrections (template v2)

| # | Client ask | Change |
| --- | --- | --- |
| 1 | HPD always not applicable | `inverter_hpd` is `source: fixed`, value "Not applicable". No input. |
| 2 | Remove "free of cost" | Removed from both sentences of the guarantee. |
| 3 | Consumer signature properly | Signature line, then consumer name in bold, then "Consumer". |
| 4 | Vendor full legal name | `COMPANY.legalName = 'Oneohm Sustainable Green Energy Private Limited'`; fact `vendor_name` reads it; used by all four reports. |
| 5 | No header, centered title + subtitle | Header table removed. Centered title "Work Completion Report for Solar Power Plant", subtitle = vendor legal name. Page 2 is titled "Guarantee Certificate Undertaking", subtitle "To be submitted by the vendor". |
| 6 | Category = property type | `category` reads `property.propertyType` through the existing label map. |
| 7 | Guarantee on page 2 | Page 1: table, certifications, signatures. Page 2: guarantee, vendor signature, identity block. |
| 8 | Exactly two pages | `pages: 2`, a forced break before the guarantee, a compact page-1 table, and the page-count guard. |
| 9 | Identity = consumer name | "Identity details of consumer: <consumer name>". `consumer_id_type` fact removed. |
| 10 | Aadhaar from onboarding | `consumer_aadhaar_number` is `source: customer` from the new customer field. |

Signature blocks become a shared Handlebars partial (`signature`) so any report
can use them. The title block is a partial (`doc-title`) used by the WCR; the
other three keep their official layouts and only gain the legal name.

`sanction_date` becomes a manual fact and prints in WCR row 5 as
"<number> dated <date>".

The Net Metering Agreement date stops defaulting to "today" at render (a value
that changes daily would make the filed agreement permanently stale). It becomes
a required manual fact `agreement_date` with a "Today" quick-fill; the template
splits it into day / month / year.

## Aadhaar on the customer

- `customer_profiles.aadhaar_number varchar(12) NULL`.
- Shared `aadhaarSchema`: exactly 12 digits, optional.
- Create / update / response DTOs, as `alternatePhone` is carried today.
- Web: onboarding wizard step 1 (customer identity) and the customer detail
  edit. Not shown in any list.

## Migration

Two migrations, in order:

1. `ALTER TABLE customer_profiles ADD aadhaar_number varchar(12)` (ships with the customer field).
2. `ALTER TABLE projects ADD report_facts jsonb NOT NULL DEFAULT '{}'`.
3. Backfill `report_facts` from each project's latest filed report documents:
   manual keys only, renamed to the new fact keys, the most recently filed value
   winning when two reports disagree. Hand-edits of what are now system facts are
   dropped; those reports show `stale` and are re-generated from live data.
4. An Aadhaar typed into a saved WCR (12 digits after removing spaces) is copied
   to that project's customer when the customer has none.

Each `down` drops its column. Do not run `migration:revert` against the shared
database as a test.

## Error handling

- Bad manual value: 400 naming the fact and the rule; the field shows it inline.
- Filing with a missing required fact: 400 listing the facts; the button already
  names them, so this only fires on a race.
- Wrong page count: client-side error, nothing uploaded.
- Upload succeeded but filing failed: the uploaded object is deleted (kept from today).

## Verification

By running the screens (no new unit tests):

1. Onboard a test customer with an Aadhaar; see it on the WCR page 2.
2. On a test project, fill the manual facts once; see them on every report that uses them.
3. Preview the WCR: two pages, centered title, legal name, HPD "Not applicable",
   no "free of cost", names under both signatures, category = property type.
4. Generate all; each report files; the list badge drops to 0.
5. Change a system fact (e.g. the sanctioned load on the property); the affected
   reports show "Out of date"; the list badge returns.
6. Clear a required manual fact; that report shows Missing and is skipped by Generate all.

Uploads from a local backend land in the production bucket: use a test project
and delete the test files and rows afterwards.

## Open items

- The Annexure template prints `installation_date`,
  `re_installed_capacity_ground_kw` and `re_installed_capacity_rooftop_ground_kw`,
  which no schema has ever filled. They print "—" today and still will.

- Signatory facts (DCR signatory name, designation, phone, email) are still typed
  per project. If they are the same person every time, a follow-up can move them
  to `COMPANY`.
