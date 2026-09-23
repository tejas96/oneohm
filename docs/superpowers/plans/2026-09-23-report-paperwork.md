# Report Paperwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-report drawer with one project-level fact store and one Reports workspace, with status tracking (missing / ready / filed / out of date), a projects-list badge, Aadhaar on the customer, and the client's 10 WCR corrections.

**Architecture:** A shared fact catalog (`REPORT_FACTS`) names every piece of paperwork data once. Report definitions list the facts they print. One backend resolver computes every fact from live records plus a new `projects.report_facts` jsonb of hand-typed facts; the same resolver feeds the workspace endpoint and a batch pending-count endpoint. Filed report documents carry a fingerprint of the facts they printed, which is how "out of date" is detected.

**Tech Stack:** NestJS + TypeORM (Postgres), Handlebars templates, Next.js + MUI v7 + TanStack Query, `html2pdf.js` for client PDF, shared lib `@tejas96/shared`.

**Spec:** `docs/superpowers/specs/2026-09-23-report-paperwork-design.md`

## Global Constraints

- Branch: `feat/report-paperwork` (already created from `origin/main`).
- No new unit test files. Every task ends with typecheck + a run of the affected screen or endpoint (user rule: verify by running each screen).
- Vendor legal name, verbatim: `Oneohm Sustainable Green Energy Private Limited`.
- HPD value, verbatim: `Not applicable`.
- Aadhaar: optional, exactly 12 digits, stored in `customer_profiles.aadhaar_number varchar(12)`.
- A PATCH clears a value with `null`, never by omitting it.
- Never run `migration:revert` against the shared database as a test.
- Local uploads land in the production bucket: use one test project, and delete the test files and rows at the end.
- Demo and verify through the UI only (no SQL or scripts to fake state), except `migration:run`.
- Commands, from `/Volumes/works-space/oneohm/oneohm`:
  - `npm run typecheck:libs` · `npm run typecheck:backend` · `npm run typecheck:web`
  - `cd apps/backend && npm run migration:run`
  - Dev servers via the Browser pane `preview_start` names `backend` (8085) and `web` (3001).

## File map

**Shared (`libs/shared/src/`)**
- `constants/company.ts` — add `legalName`.
- `reports/facts/report-facts.ts` — NEW. Fact types, `FACT_GROUPS`, `REPORT_FACTS`, `getFact`.
- `reports/facts/validate-fact.ts` — NEW. `validateFactValue`, `applyFactPatch`.
- `reports/definitions.ts` — NEW. `ReportDefinition`, the 4 definitions, `REPORT_DEFINITIONS`, `getReportDefinition`.
- `reports/status.ts` — NEW. `ReportStatus`, `getMissingFacts`, `getReportStatus`, `isPendingStatus`.
- `reports/workspace.types.ts` — NEW. API response types.
- `reports/index.ts` — export the new files; later drop the old ones.
- `reports/schemas/*.schema.ts`, `reports/report-catalog.ts`, `reports/utils/{empty-view-model,validate-report-fields,report-completeness}.ts` — DELETED in Task 8.
- `schemas/customer.schema.ts`, `types/interfaces/common.interface.ts` — Aadhaar.

**Backend (`apps/backend/src/`)**
- `database/migrations/1857190000000-AddAadhaarToCustomerProfiles.ts` — NEW.
- `database/migrations/1857200000000-AddReportFactsToProjects.ts` — NEW (column + backfill).
- `modules/customers/entities/customer-profile.entity.ts`, `modules/customers/dto/{create,update}-customer.dto.ts`, `modules/customers/dto/customer-response.dto.ts` — Aadhaar.
- `modules/projects/entities/project.entity.ts` — `reportFacts` column.
- `modules/projects/repositories/project.repository.ts` — `findByIdsForReports`.
- `modules/bom/services/bom-read.service.ts` — `getPanelSerialsByProjects`.
- `modules/reports/facts/resolve-facts.ts` — NEW. The one resolver.
- `modules/reports/facts/facts-hash.ts` — NEW. Fingerprint + pick.
- `modules/reports/services/report-workspace.service.ts` — NEW.
- `modules/reports/dto/report-workspace.dto.ts` — NEW.
- `modules/reports/controllers/reports.controller.ts` — rewritten.
- `modules/reports/reports.module.ts` — rewired.
- `modules/reports/renderer/report-handlebars.helpers.ts` — date/Aadhaar helpers + partials.
- `modules/reports/renderer/template-renderer.service.ts` — register partials.
- `modules/reports/renderer/assets/report-print-base.css` — title + signature styles.
- `modules/reports/definitions/*/templates/*.hbs` — key renames; WCR rewritten.
- DELETED: `modules/reports/{engine,registry,providers}/`, `definitions/*/*.{mapper,plugin}.ts`, `dto/report.dto.ts`, `dto/report-completeness-response.dto.ts`.

**Web (`apps/web/`)**
- `lib/api/reports.ts` — rewritten client.
- `components/features/projects/hooks/use-project-reports.ts` — workspace, facts mutation, pending hooks.
- `components/features/projects/components/project-detail/reports/`
  - `constants/report-status.ts` — NEW.
  - `utils/fact-edit-href.ts` — NEW.
  - `utils/render-report-pdf.ts` — rewritten with page count.
  - `hooks/use-report-render.ts` — NEW.
  - `hooks/use-generate-reports.ts` — NEW.
  - `components/report-status-cards.tsx` — NEW.
  - `components/report-facts-form.tsx` — NEW.
  - `components/reports-toolbar.tsx` — NEW.
  - DELETED: `components/{report-editor-drawer,report-editor-footer,report-schema-form,report-row}.tsx`, `hooks/use-report-editor.ts`.
- `components/features/projects/components/project-detail/tabs/project-reports-tab.tsx` — rewritten.
- `components/features/projects/components/project-detail/tabs/overview/reports-card.tsx` — rewritten.
- `components/features/projects/components/reports-pending-chip.tsx` — NEW.
- `components/features/projects/components/project-list-page.tsx` — badge.
- `components/features/onboarding/components/onboarding-wizard/steps/step-1-customer-identity.tsx`, `.../onboarding-wizard/index.tsx`, `components/features/customers/hooks/use-customers.ts`, `components/features/customers/customer-detail/tabs/overview-tab.tsx` — Aadhaar.

---

### Task 1: Shared fact model

**Files:**
- Modify: `libs/shared/src/constants/company.ts`
- Create: `libs/shared/src/reports/facts/report-facts.ts`
- Create: `libs/shared/src/reports/facts/validate-fact.ts`
- Create: `libs/shared/src/reports/definitions.ts`
- Create: `libs/shared/src/reports/status.ts`
- Create: `libs/shared/src/reports/workspace.types.ts`
- Modify: `libs/shared/src/reports/index.ts`

**Interfaces:**
- Produces: `FactKey`, `ReportFact`, `FactGroup`, `FactEditAt`, `FACT_GROUPS`, `REPORT_FACTS`, `getFact(key)`, `validateFactValue(fact, value)`, `applyFactPatch(current, patch)`, `ReportDefinition`, `REPORT_DEFINITIONS`, `getReportDefinition(id)`, `ReportStatus`, `FiledReportMeta`, `getMissingFacts(def, facts)`, `getReportStatus(def, facts, filed, currentHash)`, `isPendingStatus(status)`, `ReportWorkspace`, `WorkspaceFact`, `WorkspaceReport`, `COMPANY.legalName`.

The old `REPORT_CATALOG` and schema files stay until Task 8 so every commit still compiles.

- [ ] **Step 1: Add the legal name**

In `libs/shared/src/constants/company.ts`, directly under `name: 'OneOhm',` add:

```ts
  /** Printed wherever a filed document names the vendor. */
  legalName: 'Oneohm Sustainable Green Energy Private Limited',
```

- [ ] **Step 2: Create the fact catalog**

`libs/shared/src/reports/facts/report-facts.ts`:

```ts
export type FactSource =
  | 'company'
  | 'customer'
  | 'property'
  | 'project'
  | 'bom'
  | 'manual'
  | 'fixed';

export type FactType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone' | 'year';

export type FactGroup =
  | 'vendor'
  | 'consumer'
  | 'sanction'
  | 'system'
  | 'installation'
  | 'agreement'
  | 'signatory';

/** Where a read-only fact is changed. Company facts have none: they are constants. */
export type FactEditAt = 'customer' | 'property' | 'quote' | 'bom';

export interface ReportFact {
  readonly key: string;
  readonly label: string;
  readonly type: FactType;
  readonly group: FactGroup;
  readonly source: FactSource;
  readonly placeholder?: string;
  readonly editAt?: FactEditAt;
  readonly fixedValue?: string;
}

export const FACT_GROUPS: ReadonlyArray<{ id: FactGroup; title: string }> = [
  { id: 'vendor', title: 'Vendor' },
  { id: 'consumer', title: 'Consumer' },
  { id: 'sanction', title: 'DISCOM application' },
  { id: 'system', title: 'System' },
  { id: 'installation', title: 'Installation and service' },
  { id: 'agreement', title: 'Net metering agreement' },
  { id: 'signatory', title: 'Vendor signatory' },
];

export const REPORT_FACTS = [
  { key: 'vendor_name', label: 'Vendor name', type: 'text', group: 'vendor', source: 'company' },

  { key: 'consumer_name', label: 'Consumer name', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'consumer_number', label: 'Consumer number', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'consumer_phone', label: 'Mobile number', type: 'phone', group: 'consumer', source: 'customer', editAt: 'customer' },
  { key: 'consumer_email', label: 'Email', type: 'email', group: 'consumer', source: 'customer', editAt: 'customer' },
  { key: 'consumer_aadhaar_number', label: 'Aadhaar number', type: 'text', group: 'consumer', source: 'customer', editAt: 'customer' },
  { key: 'site_address', label: 'Site address', type: 'textarea', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'site_city', label: 'City / district', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'site_state', label: 'State', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'site_category', label: 'Category', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },

  { key: 'sanction_number', label: 'Sanction number', type: 'text', group: 'sanction', source: 'manual', placeholder: '63436547' },
  { key: 'sanction_date', label: 'Sanction date', type: 'date', group: 'sanction', source: 'manual' },
  { key: 'sanctioned_capacity_kw', label: 'Sanctioned capacity (kW)', type: 'number', group: 'sanction', source: 'property', editAt: 'property' },
  { key: 'application_number', label: 'Application number', type: 'text', group: 'sanction', source: 'manual' },
  { key: 'application_date', label: 'Application date', type: 'date', group: 'sanction', source: 'manual' },
  { key: 're_arrangement_type', label: 'RE arrangement type', type: 'text', group: 'sanction', source: 'manual', placeholder: 'Net metering' },
  { key: 're_source', label: 'RE source', type: 'text', group: 'sanction', source: 'manual', placeholder: 'Solar' },
  { key: 'capacity_type', label: 'Capacity type', type: 'text', group: 'sanction', source: 'manual', placeholder: 'Rooftop' },
  { key: 'project_model', label: 'Project model', type: 'text', group: 'sanction', source: 'manual', placeholder: 'CAPEX' },

  { key: 'installed_capacity_kw', label: 'Installed capacity (kW)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'installed_capacity_wp', label: 'Installed capacity (Wp)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_make', label: 'Module make', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_model_number', label: 'ALMM model number', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_wattage', label: 'Wattage per module (Wp)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_count', label: 'Number of modules', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_total_kw', label: 'Module capacity (kW)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_warranty', label: 'Module warranty', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_serial_numbers', label: 'Module serial numbers', type: 'textarea', group: 'system', source: 'bom', editAt: 'bom' },
  { key: 'inverter_make_model', label: 'Inverter make and model', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'inverter_make', label: 'Inverter make', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'inverter_total_kw', label: 'Inverter capacity (kW)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'inverter_hpd', label: 'HPD', type: 'text', group: 'system', source: 'fixed', fixedValue: 'Not applicable' },
  { key: 'charge_controller_type', label: 'Charge controller type', type: 'text', group: 'system', source: 'manual', placeholder: 'MPPT' },
  { key: 'inverter_year_of_manufacturing', label: 'Inverter year of manufacture', type: 'year', group: 'system', source: 'manual', placeholder: '2026' },
  { key: 'cell_manufacturer_name', label: 'Cell manufacturer', type: 'text', group: 'system', source: 'manual' },
  { key: 'cell_gst_invoice_no', label: 'Cell GST invoice number', type: 'text', group: 'system', source: 'manual' },

  { key: 'earthing_details', label: 'Earthing details', type: 'text', group: 'installation', source: 'manual', placeholder: '3 - 3Ω, 4Ω, 3Ω' },
  { key: 'lightning_arrester_text', label: 'Lightning arrester', type: 'textarea', group: 'installation', source: 'manual' },
  { key: 'cmc_period_years', label: 'CMC period (years)', type: 'number', group: 'installation', source: 'manual', placeholder: '5' },

  { key: 'agreement_date', label: 'Agreement date', type: 'date', group: 'agreement', source: 'manual' },
  { key: 'licensee_address', label: 'Licensee address', type: 'textarea', group: 'agreement', source: 'manual' },
  { key: 'signatory_licensee_name', label: 'Signatory (licensee)', type: 'text', group: 'agreement', source: 'manual' },
  { key: 'witness_consumer_name', label: 'Witness (consumer)', type: 'text', group: 'agreement', source: 'manual' },
  { key: 'witness_licensee_name', label: 'Witness (licensee)', type: 'text', group: 'agreement', source: 'manual' },

  { key: 'signatory_name', label: 'Signatory name', type: 'text', group: 'signatory', source: 'manual' },
  { key: 'signatory_designation', label: 'Signatory designation', type: 'text', group: 'signatory', source: 'manual' },
  { key: 'signatory_phone', label: 'Signatory phone', type: 'phone', group: 'signatory', source: 'manual' },
  { key: 'signatory_email', label: 'Signatory email', type: 'email', group: 'signatory', source: 'manual' },
] as const satisfies readonly ReportFact[];

export type FactKey = (typeof REPORT_FACTS)[number]['key'];

const FACTS_BY_KEY = new Map<string, ReportFact>(
  (REPORT_FACTS as readonly ReportFact[]).map((fact) => [fact.key, fact]),
);

export function getFact(key: string): ReportFact | undefined {
  return FACTS_BY_KEY.get(key);
}
```

- [ ] **Step 3: Create fact validation**

`libs/shared/src/reports/facts/validate-fact.ts`:

```ts
import { getFact, type ReportFact } from './report-facts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s+\-()]{6,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_LENGTH: Record<ReportFact['type'], number> = {
  text: 200,
  textarea: 1000,
  number: 20,
  date: 10,
  email: 200,
  phone: 20,
  year: 4,
};

/** Null when valid. An empty value is always valid here; required-ness is per report. */
export function validateFactValue(
  fact: Pick<ReportFact, 'label' | 'type'>,
  raw: string,
): string | null {
  const value = raw.trim();
  if (!value) return null;

  const max = MAX_LENGTH[fact.type];
  if (value.length > max) return `${fact.label} is too long (max ${max} characters)`;

  switch (fact.type) {
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? null : `${fact.label} must be a number`;
    }
    case 'date': {
      if (!DATE_RE.test(value)) return `${fact.label} must be a date`;
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
        ? null
        : `${fact.label} must be a real date`;
    }
    case 'year': {
      const year = Number(value);
      const now = new Date().getFullYear();
      return /^\d{4}$/.test(value) && year >= 2000 && year <= now
        ? null
        : `${fact.label} must be a year between 2000 and ${now}`;
    }
    case 'email':
      return EMAIL_RE.test(value) ? null : `${fact.label} must be an email address`;
    case 'phone':
      return PHONE_RE.test(value) ? null : `${fact.label} must be a phone number`;
    default:
      return null;
  }
}

export interface FactPatchResult {
  next: Record<string, string>;
  errors: Record<string, string>;
}

/** `null` or blank clears a key. Only manual facts can be patched. */
export function applyFactPatch(
  current: Record<string, string>,
  patch: Record<string, unknown>,
): FactPatchResult {
  const next = { ...current };
  const errors: Record<string, string> = {};

  for (const [key, value] of Object.entries(patch)) {
    const fact = getFact(key);
    if (!fact || fact.source !== 'manual') {
      errors[key] = `${key} cannot be edited on the Reports tab`;
      continue;
    }
    if (value === null || (typeof value === 'string' && value.trim() === '')) {
      delete next[key];
      continue;
    }
    if (typeof value !== 'string') {
      errors[key] = `${fact.label} must be text`;
      continue;
    }
    const message = validateFactValue(fact, value);
    if (message) {
      errors[key] = message;
      continue;
    }
    next[key] = value.trim();
  }

  return { next, errors };
}
```

- [ ] **Step 4: Create the report definitions**

`libs/shared/src/reports/definitions.ts`:

```ts
import type { FactKey } from './facts/report-facts';
import { DocumentTag } from '../types/enums/document.enum';

export interface ReportFactRef {
  key: FactKey;
  required?: boolean;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  documentTag: DocumentTag;
  /** Bump when the template's wording or layout changes: filed copies turn "out of date". */
  templateVersion: number;
  /** Exact page count the PDF must have. Only declared where it has been measured. */
  pages?: number;
  facts: readonly ReportFactRef[];
}

const req = (key: FactKey): ReportFactRef => ({ key, required: true });
const opt = (key: FactKey): ReportFactRef => ({ key });

export const WCR_REPORT: ReportDefinition = {
  id: 'wcr',
  name: 'Work Completion Report',
  description: 'Solar plant installation completion certificate (WCR).',
  documentTag: DocumentTag.WCR,
  templateVersion: 2,
  pages: 2,
  facts: [
    req('vendor_name'),
    req('consumer_name'),
    req('consumer_number'),
    opt('site_category'),
    req('site_address'),
    opt('sanction_number'),
    opt('sanction_date'),
    req('sanctioned_capacity_kw'),
    req('installed_capacity_kw'),
    req('module_make'),
    opt('module_model_number'),
    req('module_wattage'),
    req('module_count'),
    opt('module_total_kw'),
    opt('module_warranty'),
    req('inverter_make_model'),
    req('inverter_total_kw'),
    opt('charge_controller_type'),
    opt('inverter_hpd'),
    opt('inverter_year_of_manufacturing'),
    req('earthing_details'),
    opt('lightning_arrester_text'),
    opt('cmc_period_years'),
    opt('consumer_aadhaar_number'),
  ],
};

export const DCR_REPORT: ReportDefinition = {
  id: 'dcr',
  name: 'DCR Undertaking / Self-Declaration',
  description: 'Domestic Content Requirement self-declaration for MNRE/MSEDCL submission.',
  documentTag: DocumentTag.DCR,
  templateVersion: 2,
  facts: [
    req('vendor_name'),
    req('installed_capacity_kw'),
    req('consumer_name'),
    req('site_address'),
    req('application_number'),
    opt('application_date'),
    opt('module_wattage'),
    req('module_count'),
    opt('module_serial_numbers'),
    req('module_make'),
    opt('cell_manufacturer_name'),
    opt('cell_gst_invoice_no'),
    req('signatory_name'),
    req('signatory_designation'),
    opt('signatory_phone'),
    opt('signatory_email'),
  ],
};

export const NET_METERING_AGREEMENT_REPORT: ReportDefinition = {
  id: 'net-metering-agreement',
  name: 'Net Metering Connection Agreement',
  description: 'Annexure-3 legal agreement between consumer and MSEDCL for net-metering.',
  documentTag: DocumentTag.NET_METERING_AGREEMENT,
  templateVersion: 2,
  facts: [
    req('site_city'),
    req('agreement_date'),
    req('consumer_name'),
    req('site_address'),
    req('consumer_number'),
    opt('licensee_address'),
    req('installed_capacity_wp'),
    opt('witness_consumer_name'),
    opt('witness_licensee_name'),
    req('signatory_licensee_name'),
  ],
};

export const ANNEXURE_PROFORMA_A_REPORT: ReportDefinition = {
  id: 'annexure-proforma-a',
  name: 'Annexure-I & Proforma-A',
  description: 'MAHAVITARAN commissioning report for grid-connected solar PV plant.',
  documentTag: DocumentTag.ANNEXURE_PROFORMA_A,
  templateVersion: 2,
  facts: [
    req('consumer_name'),
    req('consumer_number'),
    req('consumer_phone'),
    opt('consumer_email'),
    req('site_address'),
    opt('re_arrangement_type'),
    opt('re_source'),
    req('sanctioned_capacity_kw'),
    opt('capacity_type'),
    opt('project_model'),
    req('installed_capacity_kw'),
    req('inverter_total_kw'),
    req('inverter_make'),
    req('module_count'),
    opt('module_total_kw'),
    opt('site_city'),
    opt('site_state'),
    req('vendor_name'),
  ],
};

/** Order here is the order on screen. A new report is added here and nowhere else in code. */
export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  WCR_REPORT,
  ANNEXURE_PROFORMA_A_REPORT,
  NET_METERING_AGREEMENT_REPORT,
  DCR_REPORT,
];

export function getReportDefinition(id: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((definition) => definition.id === id);
}
```

- [ ] **Step 5: Create status**

`libs/shared/src/reports/status.ts`:

```ts
import type { ReportDefinition } from './definitions';
import { type FactKey, getFact } from './facts/report-facts';

export type ReportStatus = 'missing' | 'ready' | 'filed' | 'stale';

export interface FiledReportMeta {
  factsHash?: string;
  templateVersion?: number;
}

export interface MissingFact {
  key: FactKey;
  label: string;
}

export interface ReportStatusResult {
  status: ReportStatus;
  missing: MissingFact[];
}

export function getMissingFacts(
  definition: ReportDefinition,
  facts: Record<string, string>,
): MissingFact[] {
  return definition.facts
    .filter((ref) => ref.required && !facts[ref.key]?.trim())
    .map((ref) => ({ key: ref.key, label: getFact(ref.key)?.label ?? ref.key }));
}

/**
 * A filed copy is current only while both its fingerprint and its template
 * version match. A copy filed before fingerprints existed has neither, so it
 * reads as out of date — correct, since every template changed with them.
 */
export function getReportStatus(
  definition: ReportDefinition,
  facts: Record<string, string>,
  filed: FiledReportMeta | null,
  currentHash: string,
): ReportStatusResult {
  const missing = getMissingFacts(definition, facts);

  if (filed) {
    const current =
      filed.factsHash === currentHash && filed.templateVersion === definition.templateVersion;
    if (current) return { status: 'filed', missing };
    return { status: missing.length > 0 ? 'missing' : 'stale', missing };
  }

  return { status: missing.length > 0 ? 'missing' : 'ready', missing };
}

export function isPendingStatus(status: ReportStatus): boolean {
  return status !== 'filed';
}
```

- [ ] **Step 6: Create the workspace response types**

`libs/shared/src/reports/workspace.types.ts`:

```ts
import type { FactEditAt, FactGroup, FactKey, FactSource, FactType } from './facts/report-facts';
import type { MissingFact, ReportStatus } from './status';

export interface WorkspaceFact {
  key: FactKey;
  label: string;
  type: FactType;
  group: FactGroup;
  source: FactSource;
  placeholder?: string;
  editAt?: FactEditAt;
  value: string;
  /** Ids of the reports that print this fact. */
  usedBy: string[];
}

export interface FiledReportInfo {
  documentId: string;
  fileUrl: string;
  fileName: string;
  filedAt: string;
}

export interface WorkspaceReport {
  id: string;
  name: string;
  description: string;
  status: ReportStatus;
  missing: MissingFact[];
  pages?: number;
  filed: FiledReportInfo | null;
}

export interface ReportWorkspace {
  projectId: string;
  customerId: string;
  propertyId: string;
  quoteId: string;
  facts: WorkspaceFact[];
  reports: WorkspaceReport[];
  pendingCount: number;
}

export interface ReportRenderResult {
  html: string;
  pages?: number;
}
```

- [ ] **Step 7: Export**

Append to `libs/shared/src/reports/index.ts`:

```ts
export * from './definitions';
export * from './facts/report-facts';
export * from './facts/validate-fact';
export * from './status';
export * from './workspace.types';
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck:libs`
Expected: exit 0. If `satisfies` is rejected, the lib's TypeScript is older than 4.9: check `npx tsc -v` and report instead of rewriting the catalog.

- [ ] **Step 9: Commit**

```bash
git add libs/shared/src/constants/company.ts libs/shared/src/reports
git commit -m "feat(reports): shared fact catalog, report definitions and status"
```

---

### Task 2: Aadhaar on the customer

**Files:**
- Create: `apps/backend/src/database/migrations/1857190000000-AddAadhaarToCustomerProfiles.ts`
- Modify: `apps/backend/src/modules/customers/entities/customer-profile.entity.ts`
- Modify: `apps/backend/src/modules/customers/dto/create-customer.dto.ts`
- Modify: `apps/backend/src/modules/customers/dto/update-customer.dto.ts`
- Modify: `apps/backend/src/modules/customers/dto/customer-response.dto.ts`
- Modify: `libs/shared/src/schemas/customer.schema.ts`
- Modify: `libs/shared/src/types/interfaces/common.interface.ts`
- Modify: `apps/web/components/features/customers/hooks/use-customers.ts`
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/steps/step-1-customer-identity.tsx`
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/index.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/overview-tab.tsx`

**Interfaces:**
- Produces: `CustomerProfileEntity.aadhaarNumber?: string | null` (read by Task 3's resolver as `property.customer.aadhaarNumber`).

`alternatePhone` is the model everywhere: wherever it appears in these files, add `aadhaarNumber` next to it.

- [ ] **Step 1: Migration**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional 12-digit Aadhaar, printed on the WCR. Never shown in a list. */
export class AddAadhaarToCustomerProfiles1857190000000 implements MigrationInterface {
  name = 'AddAadhaarToCustomerProfiles1857190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS aadhaar_number varchar(12) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE customer_profiles DROP COLUMN IF EXISTS aadhaar_number`);
  }
}
```

- [ ] **Step 2: Entity**

In `customer-profile.entity.ts`, directly after the `alternatePhone` column:

```ts
  @Column({ name: 'aadhaar_number', type: 'varchar', length: 12, nullable: true })
  aadhaarNumber?: string | null;
```

- [ ] **Step 3: DTOs**

`create-customer.dto.ts`, after `alternatePhone`:

```ts
  @ApiPropertyOptional({ example: '123412341234', description: 'Aadhaar number, 12 digits' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'Aadhaar number must be exactly 12 digits' })
  aadhaarNumber?: string;
```

`update-customer.dto.ts`, after `alternatePhone`:

```ts
  @ApiPropertyOptional({ example: '123412341234', description: 'Aadhaar number, 12 digits; null clears it', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^\d{12}$/, { message: 'Aadhaar number must be exactly 12 digits' })
  aadhaarNumber?: string | null;
```

`customer-response.dto.ts`, after `alternatePhone`, copying that property's decorator style:

```ts
  aadhaarNumber?: string;
```

Then find every place the response is built field by field:

Run: `grep -rn "alternatePhone" apps/backend/src/modules/customers --include=*.ts | grep -v dto/`
For each mapping line found, add the same line for `aadhaarNumber`. If the service spreads the entity (no per-field lines), nothing to add.

- [ ] **Step 4: Shared schema and type**

`libs/shared/src/schemas/customer.schema.ts`, after the `alternatePhone` line (line 20):

```ts
    aadhaarNumber: z
      .union([z.literal(''), z.string().regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits')])
      .optional(),
```

`libs/shared/src/types/interfaces/common.interface.ts`: next to `alternatePhone`, add `aadhaarNumber?: string;`.

- [ ] **Step 5: Web form**

`step-1-customer-identity.tsx`, directly after the `Alternate Phone` `MUIInput` block (ends around line 172), inside the same grid:

```tsx
        <MUIInput
          fieldLabel="Aadhaar Number"
          disabled={isLocked}
          inputMode="numeric"
          placeholder="1234 1234 1234"
          inputProps={{ maxLength: 12 }}
          error={customerErrors.aadhaarNumber?.message}
          {...register('customer.aadhaarNumber')}
        />
```

`use-customers.ts`: add `aadhaarNumber?: string;` after line 125 and `aadhaarNumber?: string | null;` after line 195 (the two `alternatePhone` declarations).

`onboarding-wizard/index.tsx`:
Run: `grep -n "alternatePhone" apps/web/components/features/onboarding/components/onboarding-wizard/index.tsx`
At each hit, add the matching `aadhaarNumber` line. When sending an update, an emptied field must go as `null` (not `undefined`), exactly as `alternatePhone` does. If `alternatePhone` is sent as `x || undefined`, send `aadhaarNumber: values.customer.aadhaarNumber || null` on update and `|| undefined` on create.

- [ ] **Step 6: Customer detail, masked**

`overview-tab.tsx`, after the `Alternate phone` row (line 153):

```tsx
          {
            label: 'Aadhaar',
            value: customer.aadhaarNumber ? `XXXX XXXX ${customer.aadhaarNumber.slice(-4)}` : '—',
            mono: true,
          },
```

- [ ] **Step 7: Run migration and typecheck**

Run: `cd apps/backend && npm run migration:run && cd ../..`
Expected: `AddAadhaarToCustomerProfiles1857190000000` executed.
Run: `npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web`
Expected: exit 0.

- [ ] **Step 8: Verify in the browser**

Start `backend` and `web` with `preview_start`. Sign in. Open onboarding, fill a test customer with Aadhaar `12341234123` (11 digits): the field shows "Aadhaar number must be exactly 12 digits". Fix to `123412341234`, finish. Open the customer: the overview shows `XXXX XXXX 1234`. Edit the customer, clear Aadhaar, save, reopen: it shows `—`. Put it back.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/database/migrations/1857190000000-AddAadhaarToCustomerProfiles.ts apps/backend/src/modules/customers libs/shared/src/schemas/customer.schema.ts libs/shared/src/types/interfaces/common.interface.ts apps/web/components/features/customers apps/web/components/features/onboarding
git commit -m "feat(customers): optional Aadhaar number on the customer"
```

---

### Task 3: Fact store, resolver and fingerprint

**Files:**
- Create: `apps/backend/src/database/migrations/1857200000000-AddReportFactsToProjects.ts`
- Modify: `apps/backend/src/modules/projects/entities/project.entity.ts`
- Create: `apps/backend/src/modules/reports/facts/resolve-facts.ts`
- Create: `apps/backend/src/modules/reports/facts/facts-hash.ts`

**Interfaces:**
- Consumes: `REPORT_FACTS`, `ReportFact`, `FactKey`, `ReportDefinition` (Task 1); `aadhaarNumber` (Task 2).
- Produces: `ProjectEntity.reportFacts: Record<string, string>`; `resolveFacts({ project, panelSerials }): Record<FactKey, string>`; `hashReportFacts(def, facts): string`; `pickReportFacts(def, facts): Record<string, string>`.

- [ ] **Step 1: Confirm column names the backfill relies on**

Run: `grep -n "createdAt\|created_at" apps/backend/src/common/entities/base.entity.ts apps/backend/src/**/base.entity.ts 2>/dev/null | head -3`
Expected: a `created_at` column on the base entity that `DocumentEntity` extends. If the name differs, use the real one in Step 2.

- [ ] **Step 2: Migration with backfill**

`1857200000000-AddReportFactsToProjects.ts`:

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hand-typed report facts move from each filed report's own copy
 * (documents.metadata.reportFields) to one store per project.
 *
 * Only facts that are still typed by hand are carried. Values a user typed
 * over live data (consumer name, capacity…) are dropped on purpose: those
 * reports now read the live value and show as out of date until re-filed.
 * When two reports disagree, the most recently filed wins.
 */
const MANUAL_KEYS: Record<string, string> = {
  sanction_number: 'sanction_number',
  charge_controller_type: 'charge_controller_type',
  inverter_year_of_manufacturing: 'inverter_year_of_manufacturing',
  earthing_details: 'earthing_details',
  lightning_arrester_text: 'lightning_arrester_text',
  cmc_period_years: 'cmc_period_years',
  application_number: 'application_number',
  application_date: 'application_date',
  cell_manufacturer_name: 'cell_manufacturer_name',
  cell_gst_invoice_no: 'cell_gst_invoice_no',
  signatory_name: 'signatory_name',
  signatory_designation: 'signatory_designation',
  signatory_phone: 'signatory_phone',
  signatory_email: 'signatory_email',
  licensee_address: 'licensee_address',
  witness_consumer_name: 'witness_consumer_name',
  witness_licensee_name: 'witness_licensee_name',
  signatory_licensee_name: 'signatory_licensee_name',
  re_arrangement_type: 're_arrangement_type',
  re_source: 're_source',
  capacity_type: 'capacity_type',
  project_model: 'project_model',
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function agreementDate(fields: Record<string, unknown>): string | null {
  const day = Number(String(fields.day ?? '').trim());
  const monthIndex = MONTHS.indexOf(String(fields.month ?? '').trim().toLowerCase());
  const year = Number(String(fields.year ?? '').trim());
  if (!Number.isInteger(day) || day < 1 || day > 31 || monthIndex < 0 || !Number.isInteger(year) || year < 2000) {
    return null;
  }
  const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return parsed.toISOString().startsWith(iso) ? iso : null;
}

export class AddReportFactsToProjects1857200000000 implements MigrationInterface {
  name = 'AddReportFactsToProjects1857200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS report_facts jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );

    const rows: Array<{ project_id: string; tag: string; fields: Record<string, unknown> }> =
      await queryRunner.query(
        `SELECT d.entity_id AS project_id, d.tag, d.metadata->'reportFields' AS fields
           FROM documents d
          WHERE d.entity_type = 'project'
            AND d.category = 'report'
            AND d.tag IN ('wcr', 'dcr', 'net_metering_agreement', 'annexure_proforma_a')
            AND d.deleted_at IS NULL
            AND d.metadata ? 'reportFields'
          ORDER BY d.created_at ASC`,
      );

    const factsByProject = new Map<string, Record<string, string>>();
    const aadhaarByProject = new Map<string, string>();

    for (const row of rows) {
      const fields = row.fields ?? {};
      const facts = factsByProject.get(row.project_id) ?? {};

      for (const [oldKey, newKey] of Object.entries(MANUAL_KEYS)) {
        const value = fields[oldKey];
        if (typeof value === 'string' && value.trim()) facts[newKey] = value.trim();
      }
      if (row.tag === 'net_metering_agreement') {
        const date = agreementDate(fields);
        if (date) facts.agreement_date = date;
      }
      if (row.tag === 'wcr' && typeof fields.consumer_aadhaar_number === 'string') {
        const digits = fields.consumer_aadhaar_number.replace(/\D/g, '');
        if (digits.length === 12) aadhaarByProject.set(row.project_id, digits);
      }

      factsByProject.set(row.project_id, facts);
    }

    for (const [projectId, facts] of factsByProject) {
      await queryRunner.query(`UPDATE projects SET report_facts = $1::jsonb WHERE id = $2`, [
        JSON.stringify(facts),
        projectId,
      ]);
    }

    for (const [projectId, aadhaar] of aadhaarByProject) {
      await queryRunner.query(
        `UPDATE customer_profiles cp
            SET aadhaar_number = $1
           FROM projects p
           JOIN customer_properties prop ON prop.id = p.property_id
          WHERE p.id = $2
            AND cp.id = prop.customer_id
            AND cp.aadhaar_number IS NULL`,
        [aadhaar, projectId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS report_facts`);
  }
}
```

Check before running: `grep -n "category" apps/backend/src/modules/documents/entities/document.entity.ts` shows the column is named `category` and `DocumentCategory.REPORT = 'report'` (it is, `libs/shared/src/types/enums/document.enum.ts:22`).

- [ ] **Step 3: Entity column**

In `project.entity.ts`, next to the other jsonb columns:

```ts
  /** Hand-typed report facts, keyed by manual FactKey. Everything else is read live. */
  @Column({ name: 'report_facts', type: 'jsonb', default: () => "'{}'::jsonb" })
  reportFacts!: Record<string, string>;
```

- [ ] **Step 4: Resolver**

`apps/backend/src/modules/reports/facts/resolve-facts.ts`:

```ts
import { COMPANY } from '@tejas96/shared/constants';
import { type FactKey, REPORT_FACTS, type ReportFact } from '@tejas96/shared/reports';
import { PROPERTY_TYPE_LABELS } from '@tejas96/shared/types';

import type { ProjectEntity } from '../../projects/entities/project.entity';
import { getQuoteSnapshot, getSystemSizeKw } from '../utils/quote-snapshot.util';
import { customerDisplayName, formatPropertyAddress, str } from '../utils/report.utils';

export interface ReportSource {
  /** Loaded with property, property.customer and the latest quote version. */
  project: ProjectEntity;
  panelSerials: string[];
}

/**
 * Every fact for one project, from live records plus the hand-typed store.
 *
 * Pure on purpose: the workspace and the projects-list batch both call it, and
 * a filed report's fingerprint is only comparable if both produce the same
 * string for the same data. Serials are sorted for that reason — their load
 * order differs between the two paths.
 */
export function resolveFacts({ project, panelSerials }: ReportSource): Record<FactKey, string> {
  const facts = {} as Record<FactKey, string>;
  const manual = project.reportFacts ?? {};

  for (const fact of REPORT_FACTS as readonly ReportFact[]) {
    const key = fact.key as FactKey;
    if (fact.source === 'manual') facts[key] = manual[fact.key] ?? '';
    else if (fact.source === 'fixed') facts[key] = fact.fixedValue ?? '';
    else facts[key] = '';
  }

  const property = project.property;
  const customer = property.customer;
  const snapshot = getQuoteSnapshot(project);
  const panel = snapshot?.calculation?.panels?.[0];
  const inverters = snapshot?.calculation?.inverters?.inverters ?? [];
  const kw = getSystemSizeKw(project);

  facts.vendor_name = COMPANY.legalName;

  facts.consumer_name = customerDisplayName(property);
  facts.consumer_number = str(property.consumerNumber);
  facts.consumer_phone = str(customer?.phone);
  facts.consumer_email = str(customer?.email);
  facts.consumer_aadhaar_number = str(customer?.aadhaarNumber);
  facts.site_address = formatPropertyAddress(property);
  facts.site_city = str(property.city);
  facts.site_state = str(property.state);
  facts.site_category = property.propertyType ? (PROPERTY_TYPE_LABELS[property.propertyType] ?? '') : '';
  facts.sanctioned_capacity_kw = str(property.sanctionedLoad);

  facts.installed_capacity_kw = str(kw);
  facts.installed_capacity_wp = kw != null ? str(Math.round(kw * 1000)) : '';

  if (panel) {
    facts.module_make = str(panel.brand);
    facts.module_model_number = str(panel.name);
    facts.module_wattage = str(panel.wattagePerPanel);
    facts.module_count = str(panel.quantity);
    const totalWp = (panel.wattagePerPanel ?? 0) * (panel.quantity ?? 0);
    facts.module_total_kw = totalWp > 0 ? str(totalWp / 1000) : '';
    const product = panel.productWarrantyYears;
    const performance = panel.performanceWarrantyYears;
    facts.module_warranty =
      product || performance
        ? `${product ?? ''}${product && performance ? '+' : ''}${performance ?? ''} Years`.trim()
        : '';
  }

  // A mixed inverter set is joined, never truncated to its first entry: this
  // is filed with the utility, and the first entry understated one system by a third.
  if (inverters.length > 0) {
    facts.inverter_make_model = inverters
      .map((inv) =>
        `${[inv.brand, inv.name].filter(Boolean).join(' ')} ${str(inv.capacityKw)} kW × ${str(inv.quantity)}`.trim(),
      )
      .join(', ');
    facts.inverter_make = Array.from(
      new Set(inverters.map((inv) => inv.brand).filter(Boolean)),
    ).join(', ');
    const totalKw = inverters.reduce(
      (sum, inv) => sum + (inv.capacityKw ?? 0) * (inv.quantity ?? 0),
      0,
    );
    facts.inverter_total_kw = str(totalKw);
  }

  facts.module_serial_numbers = [...panelSerials].sort().join(', ');

  return facts;
}
```

- [ ] **Step 5: Fingerprint**

`apps/backend/src/modules/reports/facts/facts-hash.ts`:

```ts
import { createHash } from 'crypto';

import type { ReportDefinition } from '@tejas96/shared/reports';

/** The values one report prints, in definition order. Stored on the filed document for audit. */
export function pickReportFacts(
  definition: ReportDefinition,
  facts: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(definition.facts.map(({ key }) => [key, (facts[key] ?? '').trim()]));
}

export function hashReportFacts(
  definition: ReportDefinition,
  facts: Record<string, string>,
): string {
  const pairs = definition.facts.map(({ key }) => [key, (facts[key] ?? '').trim()]);
  return createHash('sha256').update(JSON.stringify(pairs)).digest('hex');
}
```

- [ ] **Step 6: Run migration and typecheck**

Run: `cd apps/backend && npm run migration:run && cd ../..`
Expected: `AddReportFactsToProjects1857200000000` executed, no error.
Run: `npm run typecheck:backend`
Expected: exit 0. If `PROPERTY_TYPE_LABELS` is not exported from `@tejas96/shared/types`, import it from the same path other backend files use: `grep -rn "PROPERTY_TYPE_LABELS" apps/backend/src | head -1`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/database/migrations/1857200000000-AddReportFactsToProjects.ts apps/backend/src/modules/projects/entities/project.entity.ts apps/backend/src/modules/reports/facts
git commit -m "feat(reports): per-project fact store, one resolver, fingerprint"
```

---

### Task 4: Workspace service, endpoints, template keys

**Files:**
- Modify: `apps/backend/src/modules/projects/repositories/project.repository.ts`
- Modify: `apps/backend/src/modules/bom/services/bom-read.service.ts`
- Create: `apps/backend/src/modules/reports/services/report-workspace.service.ts`
- Create: `apps/backend/src/modules/reports/dto/report-workspace.dto.ts`
- Modify (rewrite): `apps/backend/src/modules/reports/controllers/reports.controller.ts`
- Modify (rewrite): `apps/backend/src/modules/reports/reports.module.ts`
- Modify: `apps/backend/src/modules/reports/renderer/report-handlebars.helpers.ts`
- Modify: templates `definitions/{dcr,net-metering-agreement,annexure-proforma-a,wcr}/templates/*.hbs`
- Delete: `apps/backend/src/modules/reports/{engine,registry,providers}/`, `definitions/*/*.mapper.ts`, `definitions/*/*.plugin.ts`, `dto/report.dto.ts`, `dto/report-completeness-response.dto.ts`

**Interfaces:**
- Consumes: Task 1 shared API, Task 3 `resolveFacts`, `hashReportFacts`, `pickReportFacts`, `ProjectEntity.reportFacts`.
- Produces HTTP:
  - `GET /reports/projects/:projectId` → `ReportWorkspace`
  - `PATCH /reports/projects/:projectId/facts` body `{ facts: Record<string, string | null> }` → `ReportWorkspace`
  - `POST /reports/projects/:projectId/render` body `{ reportId }` → `ReportRenderResult`
  - `POST /reports/projects/:projectId/file` body `{ reportId, file: { fileKey, publicUrl, fileSizeBytes } }` → `{ documentId: string; fileUrl: string }`
  - `POST /reports/pending` body `{ projectIds: string[] }` → `Record<string, number>`
- Template path convention: `definitions/<id>/templates/<id>.hbs`. A new report needs no registration beyond its definition.

- [ ] **Step 1: Batch project loader**

In `project.repository.ts`, after `findById`:

```ts
  /** The report resolver's inputs for many projects in one query. */
  async findByIdsForReports(ids: string[]): Promise<ProjectEntity[]> {
    if (ids.length === 0) return [];
    return this.getRepo()
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', this.latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('property.customer', 'customer')
      .where('project.id IN (:...ids)', { ids })
      .getMany();
  }
```

- [ ] **Step 2: Batch serials**

In `bom-read.service.ts`, after `getPanelSerials`:

```ts
  /** Same rows as getPanelSerials, for many projects in one query. */
  async getPanelSerialsByProjects(projectIds: string[]): Promise<Map<string, string[]>> {
    const byProject = new Map<string, string[]>();
    if (projectIds.length === 0) return byProject;

    const rows: Array<{ project_id: string; serial_number: string }> = await this.dataSource.query(
      `SELECT b.project_id, s.serial_number
         FROM bom b
         JOIN bom_items i ON i.bom_id = b.id
         JOIN bom_item_serials s ON s.bom_item_id = i.id
        WHERE b.project_id = ANY($1)
          AND TRIM(COALESCE(s.serial_number, '')) <> ''`,
      [projectIds],
    );

    for (const row of rows) {
      const list = byProject.get(row.project_id) ?? [];
      list.push(row.serial_number);
      byProject.set(row.project_id, list);
    }
    return byProject;
  }
```

- [ ] **Step 3: Handlebars helpers used by the renamed templates**

In `report-handlebars.helpers.ts`, inside `registerReportHandlebarsHelpers()`, add:

```ts
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const isoParts = (value: unknown): [string, string, string] | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value.trim() : '');
    return match ? [match[1], match[2], match[3]] : null;
  };
  Handlebars.registerHelper('formatDate', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? `${parts[2]}-${parts[1]}-${parts[0]}` : '—';
  });
  Handlebars.registerHelper('dateDay', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? String(Number(parts[2])) : '—';
  });
  Handlebars.registerHelper('dateMonthName', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? MONTH_NAMES[Number(parts[1]) - 1] : '—';
  });
  Handlebars.registerHelper('dateYear', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? parts[0] : '—';
  });
  Handlebars.registerHelper('formatAadhaar', (value: unknown) => {
    const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
    return digits.length === 12 ? `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}` : '—';
  });
```

- [ ] **Step 4: Rename template keys**

Run from `apps/backend/src/modules/reports/definitions`:

```bash
sed -i '' \
  -e 's/{{consumer_address}}/{{site_address}}/g' \
  -e 's/{{capacity_kw}}/{{installed_capacity_kw}}/g' \
  -e 's/{{number_of_pv_modules}}/{{module_count}}/g' \
  -e 's/{{pv_module_capacities}}/{{module_wattage}}/g' \
  -e 's/{{pv_module_make}}/{{module_make}}/g' \
  -e 's/{{pv_module_serial_numbers}}/{{module_serial_numbers}}/g' \
  dcr/templates/dcr.hbs

sed -i '' \
  -e 's/{{dash consumer_address}}/{{dash site_address}}/g' \
  -e 's/{{dash location}}/{{dash site_city}}/g' \
  -e 's/{{dash day}}/{{dateDay agreement_date}}/g' \
  -e 's/{{dash month}}/{{dateMonthName agreement_date}}/g' \
  -e 's/{{dash year}}/{{dateYear agreement_date}}/g' \
  -e 's/{{signatory_consumer_name}}/{{consumer_name}}/g' \
  net-metering-agreement/templates/net-metering-agreement.hbs

sed -i '' \
  -e 's/{{address_of_installation}}/{{site_address}}/g' \
  -e 's/{{dash address_of_installation}}/{{dash site_address}}/g' \
  -e 's/{{dash district}}/{{dash site_city}}/g' \
  -e 's/{{dash state}}/{{dash site_state}}/g' \
  -e 's/{{email}}/{{consumer_email}}/g' \
  -e 's/{{mobile_number}}/{{consumer_phone}}/g' \
  -e 's/{{inverter_capacity_kw}}/{{inverter_total_kw}}/g' \
  -e 's/{{module_capacity_kw}}/{{module_total_kw}}/g' \
  -e 's/{{no_of_pv_modules}}/{{module_count}}/g' \
  -e 's/{{re_installed_capacity_rooftop_kw}}/{{installed_capacity_kw}}/g' \
  annexure-proforma-a/templates/annexure-proforma-a.hbs

sed -i '' \
  -e 's/{{total_capacity_kwp}}/{{module_total_kw}}/g' \
  -e 's/{{inverter_rating}}/{{inverter_total_kw}}/g' \
  -e 's/{{inverter_capacity}}/{{inverter_total_kw}}/g' \
  -e 's/{{category}}/{{site_category}}/g' \
  wcr/templates/wcr.hbs
```

The WCR is fully rewritten in Task 5; this rename only keeps it rendering meanwhile.

Then check that every placeholder is a known fact:

```bash
node -e '
const fs=require("fs");
const src=fs.readFileSync("../../../../../../libs/shared/src/reports/facts/report-facts.ts","utf8");
const keys=new Set([...src.matchAll(/key: \x27([a-z_]+)\x27/g)].map(m=>m[1]));
const ok=new Set(["installation_date","re_installed_capacity_ground_kw","re_installed_capacity_rooftop_ground_kw"]);
for (const f of ["dcr/templates/dcr.hbs","net-metering-agreement/templates/net-metering-agreement.hbs","annexure-proforma-a/templates/annexure-proforma-a.hbs","wcr/templates/wcr.hbs"]) {
  const t=fs.readFileSync(f,"utf8");
  for (const m of t.matchAll(/\{\{(?:dash |formatDate |dateDay |dateMonthName |dateYear |formatAadhaar )?([a-z_]+)\}\}/g)) {
    if (!keys.has(m[1]) && !ok.has(m[1])) console.log(f, "unknown:", m[1]);
  }
}'
```

Expected: no output. (The three names in `ok` are the pre-existing Annexure gaps listed in the spec's open items.)

- [ ] **Step 5: DTOs**

`apps/backend/src/modules/reports/dto/report-workspace.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { REPORT_DEFINITIONS } from '@tejas96/shared/reports';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const REPORT_IDS = REPORT_DEFINITIONS.map((definition) => definition.id);

export class UpdateReportFactsDto {
  @ApiProperty({
    description: 'Manual fact values by key. null clears a value; an omitted key is left alone.',
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
  })
  @IsObject()
  facts!: Record<string, string | null>;
}

export class RenderReportDto {
  @ApiProperty({ enum: REPORT_IDS })
  @IsIn(REPORT_IDS)
  reportId!: string;
}

export class ReportFileRefDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicUrl!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  fileSizeBytes!: number;
}

export class FileReportDto extends RenderReportDto {
  @ApiProperty({ type: ReportFileRefDto })
  @ValidateNested()
  @Type(() => ReportFileRefDto)
  file!: ReportFileRefDto;
}

export class ReportsPendingDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  projectIds!: string[];
}
```

- [ ] **Step 6: Workspace service**

`apps/backend/src/modules/reports/services/report-workspace.service.ts`:

```ts
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  applyFactPatch,
  type FactKey,
  getMissingFacts,
  getReportDefinition,
  getReportStatus,
  isPendingStatus,
  REPORT_DEFINITIONS,
  REPORT_FACTS,
  type ReportDefinition,
  type ReportFact,
  type ReportRenderResult,
  type ReportStatusResult,
  type ReportWorkspace,
} from '@tejas96/shared/reports';
import { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import { BomReadService } from '../../bom/services/bom-read.service';
import type { DocumentEntity } from '../../documents/entities/document.entity';
import { DocumentService } from '../../documents/services/document.service';
import type { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { ProjectService } from '../../projects/services/project.service';
import { StorageService } from '../../storage/services/storage.service';
import type { ReportFileRefDto } from '../dto/report-workspace.dto';
import { hashReportFacts, pickReportFacts } from '../facts/facts-hash';
import { resolveFacts } from '../facts/resolve-facts';
import { TemplateRendererService } from '../renderer/template-renderer.service';

const REPORT_TAGS = new Set<string>(REPORT_DEFINITIONS.map((definition) => definition.documentTag));

function templateFileFor(definition: ReportDefinition): string {
  return `definitions/${definition.id}/templates/${definition.id}.hbs`;
}

/** Newest filed report document per tag. Hand uploads with the same tag do not count. */
function latestFiledByTag(docs: DocumentEntity[]): Map<string, DocumentEntity> {
  const sorted = docs
    .filter((doc) => doc.category === DocumentCategory.REPORT && REPORT_TAGS.has(doc.tag))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const byTag = new Map<string, DocumentEntity>();
  for (const doc of sorted) if (!byTag.has(doc.tag)) byTag.set(doc.tag, doc);
  return byTag;
}

function statusOf(
  definition: ReportDefinition,
  facts: Record<string, string>,
  filedDoc: DocumentEntity | undefined,
): ReportStatusResult {
  const meta = filedDoc?.metadata as { factsHash?: string; templateVersion?: number } | undefined;
  return getReportStatus(
    definition,
    facts,
    filedDoc ? { factsHash: meta?.factsHash, templateVersion: meta?.templateVersion } : null,
    hashReportFacts(definition, facts),
  );
}

@Injectable()
export class ReportWorkspaceService {
  private readonly logger = new Logger(ReportWorkspaceService.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRepository: ProjectRepository,
    private readonly bomReadService: BomReadService,
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  async getWorkspace(projectId: string): Promise<ReportWorkspace> {
    const { project, facts } = await this.load(projectId);
    const docs = await this.documentService.findByEntity(DocumentEntityType.PROJECT, projectId);
    const filedByTag = latestFiledByTag(docs);

    const usedBy = new Map<string, string[]>();
    for (const definition of REPORT_DEFINITIONS) {
      for (const { key } of definition.facts) {
        usedBy.set(key, [...(usedBy.get(key) ?? []), definition.id]);
      }
    }

    const reports = REPORT_DEFINITIONS.map((definition) => {
      const filedDoc = filedByTag.get(definition.documentTag);
      const { status, missing } = statusOf(definition, facts, filedDoc);
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        status,
        missing,
        pages: definition.pages,
        filed: filedDoc
          ? {
              documentId: filedDoc.id,
              fileUrl: filedDoc.fileUrl,
              fileName: filedDoc.fileName,
              filedAt: new Date(filedDoc.createdAt).toISOString(),
            }
          : null,
      };
    });

    return {
      projectId,
      customerId: project.property.customerId,
      propertyId: project.propertyId,
      quoteId: project.quote.id,
      facts: (REPORT_FACTS as readonly ReportFact[])
        .filter((fact) => usedBy.has(fact.key))
        .map((fact) => ({
          key: fact.key as FactKey,
          label: fact.label,
          type: fact.type,
          group: fact.group,
          source: fact.source,
          placeholder: fact.placeholder,
          editAt: fact.editAt,
          value: facts[fact.key as FactKey] ?? '',
          usedBy: usedBy.get(fact.key) ?? [],
        })),
      reports,
      pendingCount: reports.filter((report) => isPendingStatus(report.status)).length,
    };
  }

  async updateFacts(projectId: string, patch: Record<string, unknown>): Promise<ReportWorkspace> {
    const project = await this.projectService.findById(projectId);
    const { next, errors } = applyFactPatch(project.reportFacts ?? {}, patch);
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({ message: Object.values(errors).join('; '), errors });
    }
    await this.projectRepository.update(projectId, { reportFacts: next });
    return this.getWorkspace(projectId);
  }

  async render(projectId: string, reportId: string): Promise<ReportRenderResult> {
    const definition = this.definition(reportId);
    const { facts } = await this.load(projectId);
    return {
      html: this.templateRenderer.render(templateFileFor(definition), facts),
      pages: definition.pages,
    };
  }

  async file(
    projectId: string,
    reportId: string,
    file: ReportFileRefDto,
    userId: string,
  ): Promise<{ documentId: string; fileUrl: string }> {
    const definition = this.definition(reportId);
    const { facts } = await this.load(projectId);

    const missing = getMissingFacts(definition, facts);
    if (missing.length > 0) {
      throw new BadRequestException(
        `${definition.name} is missing: ${missing.map((m) => m.label).join(', ')}`,
      );
    }
    await this.validateUploadedFile(projectId, reportId, file);

    const document = await this.documentService.create(
      {
        entityType: DocumentEntityType.PROJECT,
        entityId: projectId,
        category: DocumentCategory.REPORT,
        tag: definition.documentTag,
        fileName: `${definition.name}.pdf`,
        fileUrl: file.publicUrl,
        fileSizeBytes: file.fileSizeBytes,
        mimeType: 'application/pdf',
        metadata: {
          reportFacts: pickReportFacts(definition, facts),
          factsHash: hashReportFacts(definition, facts),
          templateVersion: definition.templateVersion,
        },
      },
      userId,
    );

    await this.purgeOlder(projectId, definition.documentTag, document.id);
    this.logger.log(`Filed ${reportId} for project ${projectId}`);
    return { documentId: document.id, fileUrl: file.publicUrl };
  }

  async pendingCounts(projectIds: string[]): Promise<Record<string, number>> {
    if (projectIds.length === 0) return {};

    const [projects, serials, docs] = await Promise.all([
      this.projectRepository.findByIdsForReports(projectIds),
      this.bomReadService.getPanelSerialsByProjects(projectIds),
      this.documentService.findByEntityBatch(DocumentEntityType.PROJECT, projectIds),
    ]);

    const docsByProject = new Map<string, DocumentEntity[]>();
    for (const doc of docs) {
      docsByProject.set(doc.entityId, [...(docsByProject.get(doc.entityId) ?? []), doc]);
    }

    const counts: Record<string, number> = {};
    for (const project of projects) {
      const facts = resolveFacts({ project, panelSerials: serials.get(project.id) ?? [] });
      const filedByTag = latestFiledByTag(docsByProject.get(project.id) ?? []);
      counts[project.id] = REPORT_DEFINITIONS.filter((definition) =>
        isPendingStatus(statusOf(definition, facts, filedByTag.get(definition.documentTag)).status),
      ).length;
    }
    return counts;
  }

  private definition(reportId: string): ReportDefinition {
    const definition = getReportDefinition(reportId);
    if (!definition) throw new NotFoundException(`Report not found: ${reportId}`);
    return definition;
  }

  private async load(
    projectId: string,
  ): Promise<{ project: ProjectEntity; facts: Record<FactKey, string> }> {
    const project = await this.projectService.findById(projectId);
    const panelSerials = await this.bomReadService.getPanelSerials(projectId);
    return { project, facts: resolveFacts({ project, panelSerials }) };
  }

  private async validateUploadedFile(
    projectId: string,
    reportId: string,
    file: ReportFileRefDto,
  ): Promise<void> {
    const expectedPrefix = `project/${projectId}/${reportId}/`;
    if (!file.fileKey.startsWith(expectedPrefix)) {
      throw new BadRequestException(`Invalid file key: expected prefix "${expectedPrefix}"`);
    }
    if (this.storageService.extractFileKeyFromUrl(file.publicUrl) !== file.fileKey) {
      throw new BadRequestException('Public URL does not match the uploaded file key');
    }
    if (!(await this.storageService.fileExists(file.fileKey))) {
      throw new BadRequestException('Uploaded report file was not found in storage');
    }
  }

  private async purgeOlder(projectId: string, tag: string, keepId: string): Promise<void> {
    const docs = await this.documentService.findByEntity(DocumentEntityType.PROJECT, projectId, {
      tag,
    });
    const older = docs.filter(
      (doc) => doc.id !== keepId && doc.category === DocumentCategory.REPORT,
    );
    await Promise.allSettled(
      older.map(async (doc) => {
        const fileKey = this.storageService.extractFileKeyFromUrl(doc.fileUrl);
        if (fileKey) {
          try {
            await this.storageService.deleteFile(fileKey);
          } catch {
            /* file may already be gone */
          }
        }
        await this.documentService.hardDelete(doc.id);
      }),
    );
  }
}
```

Two checks before moving on:
- `grep -n "customerId\|propertyId" apps/backend/src/modules/customers/entities/customer-property.entity.ts apps/backend/src/modules/projects/entities/project.entity.ts | head -4` — confirms `property.customerId` and `project.propertyId` exist (they do at `customer-property.entity.ts:37` and `project.entity.ts:122`).
- `grep -n "category" apps/backend/src/modules/documents/entities/document.entity.ts` — confirms `DocumentEntity.category`. Note the old engine's `purgeExistingDocuments` also deleted hand-uploaded docs with the same tag; this one only purges report-category docs, on purpose.

- [ ] **Step 7: Controller**

Replace `reports.controller.ts` entirely:

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ReportRenderResult, ReportWorkspace } from '@tejas96/shared/reports';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  FileReportDto,
  RenderReportDto,
  ReportsPendingDto,
  UpdateReportFactsDto,
} from '../dto/report-workspace.dto';
import { ReportWorkspaceService } from '../services/report-workspace.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly workspace: ReportWorkspaceService) {}

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Every report fact and every report status for a project' })
  getWorkspace(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<ReportWorkspace> {
    return this.workspace.getWorkspace(projectId);
  }

  @Patch('projects/:projectId/facts')
  @ApiOperation({ summary: 'Set or clear (null) hand-typed report facts' })
  updateFacts(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateReportFactsDto,
  ): Promise<ReportWorkspace> {
    return this.workspace.updateFacts(projectId, dto.facts);
  }

  @Post('projects/:projectId/render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render one report from stored facts' })
  render(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: RenderReportDto,
  ): Promise<ReportRenderResult> {
    return this.workspace.render(projectId, dto.reportId);
  }

  @Post('projects/:projectId/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'File a generated report PDF against the project' })
  file(
    @CurrentUser() user: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: FileReportDto,
  ): Promise<{ documentId: string; fileUrl: string }> {
    return this.workspace.file(projectId, dto.reportId, dto.file, user.id);
  }

  @Post('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pending report count per project, for list badges' })
  pending(@Body() dto: ReportsPendingDto): Promise<Record<string, number>> {
    return this.workspace.pendingCounts(dto.projectIds);
  }
}
```

- [ ] **Step 8: Module**

Replace `reports.module.ts` entirely:

```ts
import { Module } from '@nestjs/common';

import { BomModule } from '../bom/bom.module';
import { DocumentsModule } from '../documents/documents.module';
import { ProjectsModule } from '../projects/projects.module';
import { StorageModule } from '../storage/storage.module';
import { ReportsController } from './controllers/reports.controller';
import { TemplateRendererService } from './renderer/template-renderer.service';
import { ReportWorkspaceService } from './services/report-workspace.service';

@Module({
  imports: [ProjectsModule, DocumentsModule, StorageModule, BomModule],
  controllers: [ReportsController],
  providers: [ReportWorkspaceService, TemplateRendererService],
})
export class ReportsModule {}
```

(`ReportEngineService` was exported but nothing outside the module imports it: only `app.module.ts` references `ReportsModule`.)

- [ ] **Step 9: Delete the old engine**

```bash
cd apps/backend/src/modules/reports
git rm -r engine registry providers
git rm definitions/*/*.mapper.ts definitions/*/*.plugin.ts dto/report.dto.ts dto/report-completeness-response.dto.ts
cd -
```

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck:backend`
Expected: exit 0. A leftover import of a deleted file points to a missed caller: fix it by moving it to the workspace service, not by restoring the file.

- [ ] **Step 11: Verify the endpoints**

Restart the `backend` preview server (Nest does not always pick up deleted files). Open a test project in the web app (sign in first). The Reports tab is broken until Task 6; that is expected. In the Browser pane, with the web app open, run through `javascript_tool` (the page's own auth is reused; this reads only):

```js
await (await fetch('http://localhost:8085/api/reports/projects/<TEST_PROJECT_ID>', { credentials: 'include' })).json()
```

If the API needs a bearer token rather than a cookie, take it the way the web client does (`grep -n "Authorization" apps/web/lib/api/client.ts`). Expected: `facts` includes `vendor_name` = `Oneohm Sustainable Green Energy Private Limited`, `inverter_hpd` = `Not applicable`, `site_category` = the property's type label; `reports` has 4 entries, each with a `status`. Check the API prefix with `grep -n "setGlobalPrefix" apps/backend/src/main.ts` if `/api` 404s.

- [ ] **Step 12: Commit**

```bash
git add -A apps/backend/src/modules/reports apps/backend/src/modules/projects/repositories/project.repository.ts apps/backend/src/modules/bom/services/bom-read.service.ts
git commit -m "feat(reports): workspace endpoints on the shared fact store; drop per-report mappers"
```

---

### Task 5: WCR template v2

**Files:**
- Modify: `apps/backend/src/modules/reports/renderer/report-handlebars.helpers.ts`
- Modify: `apps/backend/src/modules/reports/renderer/template-renderer.service.ts`
- Modify: `apps/backend/src/modules/reports/renderer/assets/report-print-base.css`
- Modify (rewrite body): `apps/backend/src/modules/reports/definitions/wcr/templates/wcr.hbs`

**Interfaces:**
- Consumes: Task 4 helpers `formatDate`, `formatAadhaar`; facts from Task 1.
- Produces: Handlebars partials `docTitle` (`title`, `subtitle`) and `signature` (`name`, `role`) for any template.

- [ ] **Step 1: Partials**

In `report-handlebars.helpers.ts`, add below `registerReportHandlebarsHelpers`:

```ts
/** Shared blocks any report template can use: {{> docTitle …}} and {{> signature …}}. */
export function registerReportPartials(): void {
  Handlebars.registerPartial(
    'docTitle',
    autoDashFieldPlaceholders(
      `<header class="doc-head"><h1 class="doc-title">{{title}}</h1><p class="doc-subtitle">{{subtitle}}</p></header>`,
    ),
  );
  Handlebars.registerPartial(
    'signature',
    autoDashFieldPlaceholders(
      `<div class="sig-block"><div class="sig-space"></div><div class="sig-rule"></div><div class="sig-name">{{name}}</div><div class="sig-role">{{role}}</div></div>`,
    ),
  );
}
```

In `template-renderer.service.ts`, find where `registerReportHandlebarsHelpers()` is called (`grep -n "registerReportHandlebarsHelpers" apps/backend/src/modules/reports/renderer/template-renderer.service.ts`) and call `registerReportPartials()` on the next line; add it to that file's import from `./report-handlebars.helpers`.

- [ ] **Step 2: Shared print styles**

Append to `report-print-base.css`:

```css
/* ── Centered document title (replaces the header bar) ── */
.doc-head {
  text-align: center;
  margin: 0 0 12px;
}
.doc-title {
  font-size: 13pt;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.01em;
}
.doc-subtitle {
  font-size: 9.5pt;
  font-weight: 600;
  color: #444;
  margin: 3px 0 0;
}

/* ── Signature: space to sign, rule, printed name, role ── */
.sig-row {
  display: flex;
  gap: 40px;
  margin-top: 14px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.sig-row > * {
  flex: 1;
}
.sig-space {
  height: 34px;
}
.sig-rule {
  border-top: 1px solid #1a1a1a;
}
.sig-name {
  font-size: 9pt;
  font-weight: 700;
  margin-top: 4px;
}
.sig-role {
  font-size: 8pt;
  color: #555;
  margin-top: 1px;
}
```

- [ ] **Step 3: Rewrite the WCR body**

In `wcr.hbs`: keep `<head>` and its `<style>` block, but delete the `.sig-table`, `.sig-box`, `.guarantee-heading` rules (lines 128–165 today). Set `table.main-table tbody td` padding to `3px 7px` and `.text-block` `margin-top` to `5px` so page 1 fits. Replace everything between `<body>` and `</body>` with:

```hbs
    <div class="pdf-wrapper">

      <!-- PAGE 1 — details, certifications, signatures -->
      <div class="pdf-page">
        {{> docTitle title="Work Completion Report for Solar Power Plant" subtitle=vendor_name}}

        <table class="main-table">
          <colgroup>
            <col style="width: 8%" />
            <col style="width: 36%" />
            <col style="width: 56%" />
          </colgroup>
          <thead>
            <tr><th>Sr.No</th><th>Component</th><th>Observation</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td class="label">Name</td><td><strong>{{consumer_name}}</strong></td></tr>
            <tr><td>2</td><td class="label">Consumer number</td><td><strong>{{consumer_number}}</strong></td></tr>
            <tr><td>3</td><td class="label">Site/Location With Complete Address</td><td><strong>{{site_address}}</strong></td></tr>
            <tr><td>4</td><td class="label">Category</td><td><strong>{{site_category}}</strong></td></tr>
            <tr><td>5</td><td class="label">Sanction number and date</td><td><strong>{{sanction_number}}{{#if sanction_date}} dated {{formatDate sanction_date}}{{/if}}</strong></td></tr>
            <tr><td>6</td><td class="label">Sanctioned Capacity of solar PV system (KW)</td><td><strong>{{sanctioned_capacity_kw}}</strong></td></tr>
            <tr><td class="no"></td><td class="label">Installed Capacity of solar PV system (KW)</td><td><strong>{{installed_capacity_kw}}</strong></td></tr>

            <tr><td>7</td><td class="label" colspan="2">Specification of the Modules</td></tr>
            <tr><td class="no"></td><td class="label-sub">Make of Module</td><td><strong>{{module_make}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">ALMM Model Number</td><td><strong>{{module_model_number}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Wattage per module</td><td><strong>{{module_wattage}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">No. of Module</td><td><strong>{{module_count}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Total Capacity (KWP)</td><td><strong>{{module_total_kw}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Warranty Details (Product + Performance)</td><td><strong>{{module_warranty}}</strong></td></tr>

            <tr><td>8</td><td class="label" colspan="2">PCU</td></tr>
            <tr><td class="no"></td><td class="label-sub">Make &amp; Model number of Inverter</td><td><strong>{{inverter_make_model}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Rating (KW)</td><td><strong>{{inverter_total_kw}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Type of charge controller/ MPPT</td><td><strong>{{charge_controller_type}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Capacity of Inverter (KW)</td><td><strong>{{inverter_total_kw}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">HPD</td><td><strong>{{inverter_hpd}}</strong></td></tr>
            <tr><td class="no"></td><td class="label-sub">Year of manufacturing</td><td><strong>{{inverter_year_of_manufacturing}}</strong></td></tr>

            <tr><td>9</td><td class="label">No of Separate Earthings with earth Resistance</td><td><strong>{{earthing_details}}</strong></td></tr>
          </tbody>
        </table>

        <p class="text-block">
          It is certified that the Earth Resistance measure in presence of Licensed Electrical
          Contractor/Supervisor and found in order i.e. &lt; 5 Ohms as per MNRE OM Dtd. 07.06.24
          for CFA Component.
        </p>

        {{#if lightning_arrester_text}}
        <p class="text-block"><strong>{{lightning_arrester_text}}</strong></p>
        {{/if}}

        <p class="text-block">
          We <strong>{{dash vendor_name}}</strong> &amp; <strong>{{dash consumer_name}}</strong>
          Consumer Number <strong>{{dash consumer_number}}</strong> Ensured structural stability of
          installed solar power plant and obtained requisite permissions from the concerned authority.
        </p>

        <p class="text-block">
          If in future, by virtue of any means due to collapsing or damage to installed solar power
          plant, MSEDCL will not be held responsible for any loss to property or human life, if any.
        </p>

        <p class="text-block">
          This is to Certified above Installed Solar PV System is working properly with electrical
          safety &amp; Islanding switch in case of any presence of backup inverter an arrangement
          should be made in such way the backup inverter supply should never be synchronized with
          solar inverter to avoid any electrical accident due to back feeding. We will be held
          responsible for non-working of islanding mechanism and back feed to the de-energized grid.
        </p>

        <div class="sig-row">
          {{> signature name=vendor_name role="Vendor"}}
          {{> signature name=consumer_name role="Consumer"}}
        </div>
      </div>

      <div class="pdf-page-break"></div>

      <!-- PAGE 2 — guarantee and identity -->
      <div class="pdf-page">
        {{> docTitle title="Guarantee Certificate Undertaking" subtitle="To be submitted by the vendor"}}

        <p class="guarantee-text">
          The undersigned will provide the services to the consumers for repairs/maintenance of the
          RTS plant for <strong>{{cmc_period_years}} years</strong> of the comprehensive Maintenance
          Contract (CMC) period from the date of commissioning of the plant. Non
          performing/under-performing system component will be replaced/repaired in the CMC period.
        </p>

        <div class="sig-row" style="margin-top: 36px">
          {{> signature name=vendor_name role="Vendor · Stamp and seal"}}
          <div></div>
        </div>

        <div class="identity-block">
          <div>Identity details of consumer: &nbsp;<strong>{{consumer_name}}</strong></div>
          <div>Aadhaar number: &nbsp;<strong>{{formatAadhaar consumer_aadhaar_number}}</strong></div>
        </div>
      </div>

    </div>
```

Check: `grep -n "free of cost\|header-table\|consumer_id_type" apps/backend/src/modules/reports/definitions/wcr/templates/wcr.hbs` returns nothing.

- [ ] **Step 4: Update the spec's page-2 title**

In `docs/superpowers/specs/2026-09-23-report-paperwork-design.md`, WCR table row 5, replace `Page 2 gets a centered section title "Certification and Guarantee".` with `Page 2 is titled "Guarantee Certificate Undertaking", subtitle "To be submitted by the vendor".`

- [ ] **Step 5: Typecheck and look at it**

Run: `npm run typecheck:backend` → exit 0. Restart `backend`. Render the WCR for the test project (same `javascript_tool` fetch style as Task 4, `POST .../render` with `{"reportId":"wcr"}`), then open the returned HTML in a new pane tab: `const w = window.open(); w.document.write(result.html)`. Screenshot it. Expected: centered title, legal name under it, no header bar, HPD "Not applicable", category from the property, names under both signature lines on page 1, guarantee on page 2 without "free of cost", identity line = consumer name, Aadhaar as `1234 1234 1234`. The exact 2-page check happens in Task 7 with the real PDF.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/reports/renderer apps/backend/src/modules/reports/definitions/wcr docs/superpowers/specs/2026-09-23-report-paperwork-design.md
git commit -m "feat(reports): WCR v2 — centered title, legal name, printed signatories, 2 pages"
```

---

### Task 6: Web API client and hooks

**Files:**
- Modify (rewrite): `apps/web/lib/api/reports.ts`
- Modify (rewrite): `apps/web/components/features/projects/hooks/use-project-reports.ts`
- Modify (rewrite): `apps/web/components/features/projects/components/project-detail/reports/utils/render-report-pdf.ts`
- Create: `apps/web/components/features/projects/components/project-detail/reports/hooks/use-report-render.ts`
- Create: `apps/web/components/features/projects/components/project-detail/reports/hooks/use-generate-reports.ts`

**Interfaces:**
- Consumes: Task 4 HTTP routes; shared `ReportWorkspace`, `WorkspaceReport`, `ReportRenderResult`.
- Produces: `getReportWorkspace`, `updateReportFacts`, `renderReport`, `fileReport`, `getReportsPending`; hooks `useProjectReports(projectId, options?)` → `UseQueryResult<ReportWorkspace>`, `useUpdateReportFacts(projectId)`, `useReportsPending(projectIds)`, `useReportRender(projectId, reportId, stamp)`, `useGenerateReports(projectId)` → `{ generate(reports), runningId, outcomes, clearOutcomes }`; `renderReportPdf(html)` → `{ blob, pages }`; `projectReportKeys`.

- [ ] **Step 1: API client**

Replace `apps/web/lib/api/reports.ts`:

```ts
import type { ReportRenderResult, ReportWorkspace } from '@tejas96/shared/reports';

import apiClient from './client';

export interface ReportFileRef {
  fileKey: string;
  publicUrl: string;
  fileSizeBytes: number;
}

export async function getReportWorkspace(projectId: string): Promise<ReportWorkspace> {
  const { data } = await apiClient.get<ReportWorkspace>(`/reports/projects/${projectId}`);
  return data;
}

/** `null` clears a fact. */
export async function updateReportFacts(
  projectId: string,
  facts: Record<string, string | null>,
): Promise<ReportWorkspace> {
  const { data } = await apiClient.patch<ReportWorkspace>(`/reports/projects/${projectId}/facts`, {
    facts,
  });
  return data;
}

export async function renderReport(
  projectId: string,
  reportId: string,
): Promise<ReportRenderResult> {
  const { data } = await apiClient.post<ReportRenderResult>(
    `/reports/projects/${projectId}/render`,
    { reportId },
  );
  return data;
}

export async function fileReport(
  projectId: string,
  reportId: string,
  file: ReportFileRef,
): Promise<{ documentId: string; fileUrl: string }> {
  const { data } = await apiClient.post<{ documentId: string; fileUrl: string }>(
    `/reports/projects/${projectId}/file`,
    { reportId, file },
  );
  return data;
}

export async function getReportsPending(projectIds: string[]): Promise<Record<string, number>> {
  const { data } = await apiClient.post<Record<string, number>>('/reports/pending', { projectIds });
  return data;
}
```

- [ ] **Step 2: Query hooks**

Replace `use-project-reports.ts`:

```ts
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ReportWorkspace } from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';

import { showToast } from '@/components/ui';
import { getReportsPending, getReportWorkspace, updateReportFacts } from '@/lib/api/reports';

export const projectReportKeys = {
  all: () => ['project-reports'] as const,
  byProject: (projectId: string) => [...projectReportKeys.all(), projectId] as const,
  pending: (projectIds: string[]) =>
    [...projectReportKeys.all(), 'pending', [...projectIds].sort().join(',')] as const,
};

export function useProjectReports(
  projectId: string,
  options?: { enabled?: boolean },
): UseQueryResult<ReportWorkspace, AxiosError> {
  return useQuery({
    queryKey: projectReportKeys.byProject(projectId),
    queryFn: () => getReportWorkspace(projectId),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useUpdateReportFacts(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (facts: Record<string, string | null>) => updateReportFacts(projectId, facts),
    onSuccess: (workspace) => {
      queryClient.setQueryData(projectReportKeys.byProject(projectId), workspace);
      void queryClient.invalidateQueries({ queryKey: [...projectReportKeys.all(), 'pending'] });
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      showToast.error(err.response?.data?.message ?? 'Could not save. Try again.'),
  });
}

export function useReportsPending(projectIds: string[]): UseQueryResult<Record<string, number>> {
  return useQuery({
    queryKey: projectReportKeys.pending(projectIds),
    queryFn: () => getReportsPending(projectIds),
    enabled: projectIds.length > 0,
    staleTime: 60_000,
  });
}
```

Check the hook barrel still exports what callers use: `grep -n "use-project-reports" apps/web/components/features/projects/hooks/index.ts`. If it exported `ProjectReportsData`, remove that name; Task 8 updates its users.

- [ ] **Step 3: PDF with page count**

Replace `render-report-pdf.ts` from `export async function renderReportPdfBlob` to the end of the file (keep everything above it: selectors, `buildPdfOptions`, `waitForLayout`, `mountReportHtml`) with:

```ts
interface JsPdfLike {
  getNumberOfPages(): number;
  output(type: 'blob'): Blob;
}

/** The PDF exactly as it will be filed, and how many pages it came out as. */
export async function renderReportPdf(html: string): Promise<{ blob: Blob; pages: number }> {
  const html2pdf = (await import('html2pdf.js')).default;
  const { cleanup, root } = await mountReportHtml(html);

  try {
    // html2pdf.js type definitions are incomplete — pagebreak and get('pdf') are real.
    const pdf = (await (html2pdf() as any)
      .set(buildPdfOptions() as never)
      .from(root)
      .toPdf()
      .get('pdf')) as JsPdfLike;

    const blob = pdf.output('blob');
    if (!(blob instanceof Blob)) throw new Error('Failed to generate report PDF');
    return { blob, pages: pdf.getNumberOfPages() };
  } finally {
    cleanup();
  }
}
```

If lint rejects `any`, use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` on that line only (the reason is the comment above it).

- [ ] **Step 4: Render hook**

`reports/hooks/use-report-render.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';

import { renderReport } from '@/lib/api/reports';

/** `stamp` is the workspace's dataUpdatedAt, so a saved fact re-renders the preview. */
export function useReportRender(projectId: string, reportId: string | null, stamp: number) {
  return useQuery({
    queryKey: ['project-reports', projectId, 'render', reportId, stamp],
    queryFn: () => renderReport(projectId, reportId as string),
    enabled: !!reportId,
    staleTime: Infinity,
  });
}
```

- [ ] **Step 5: Generate hook**

`reports/hooks/use-generate-reports.ts`:

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceReport } from '@tejas96/shared/reports';
import { FileCategory } from '@tejas96/shared/types';
import { useCallback, useState } from 'react';

import { renderReportPdf } from '../utils/render-report-pdf';

import { documentKeys } from '@/components/features/documents/hooks';
import { projectReportKeys } from '@/components/features/projects/hooks/use-project-reports';
import { fileReport, renderReport } from '@/lib/api/reports';
import { deleteFile, uploadFile } from '@/lib/api/storage';

export interface GenerateOutcome {
  reportId: string;
  name: string;
  ok: boolean;
  message: string;
}

async function generateOne(projectId: string, report: WorkspaceReport): Promise<GenerateOutcome> {
  const { html, pages } = await renderReport(projectId, report.id);
  const pdf = await renderReportPdf(html);

  if (pages && pdf.pages !== pages) {
    throw new Error(`${report.name} came out as ${pdf.pages} pages, expected ${pages}. Nothing was filed.`);
  }

  const upload = await uploadFile({
    file: new File([pdf.blob], `${report.id}.pdf`, { type: 'application/pdf' }),
    category: FileCategory.PROJECT,
    entityId: projectId,
    entityType: 'project',
    subCategory: report.id,
  });

  try {
    await fileReport(projectId, report.id, {
      fileKey: upload.fileKey,
      publicUrl: upload.publicUrl,
      fileSizeBytes: pdf.blob.size,
    });
  } catch (err) {
    try {
      await deleteFile(upload.fileKey);
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  }

  return { reportId: report.id, name: report.name, ok: true, message: 'Filed' };
}

/**
 * Generates one after another: html2pdf mounts a hidden frame per run and
 * parallel runs fight over fonts and layout. A failure is recorded and the
 * rest still run; a report with missing facts is skipped by name.
 */
export function useGenerateReports(projectId: string) {
  const queryClient = useQueryClient();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<GenerateOutcome[]>([]);

  const generate = useCallback(
    async (reports: WorkspaceReport[]): Promise<GenerateOutcome[]> => {
      const results: GenerateOutcome[] = [];
      setOutcomes([]);

      for (const report of reports) {
        if (report.status === 'missing') {
          results.push({
            reportId: report.id,
            name: report.name,
            ok: false,
            message: `Skipped — missing ${report.missing.map((m) => m.label).join(', ')}`,
          });
          continue;
        }
        setRunningId(report.id);
        try {
          results.push(await generateOne(projectId, report));
        } catch (err) {
          const axiosMessage = (err as { response?: { data?: { message?: string } } }).response
            ?.data?.message;
          results.push({
            reportId: report.id,
            name: report.name,
            ok: false,
            message: axiosMessage ?? (err instanceof Error ? err.message : 'Failed'),
          });
        }
      }

      setRunningId(null);
      setOutcomes(results);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectReportKeys.all() }),
        queryClient.invalidateQueries({ queryKey: documentKeys.all() }),
      ]);
      return results;
    },
    [projectId, queryClient],
  );

  return { generate, runningId, outcomes, clearOutcomes: () => setOutcomes([]) };
}
```

- [ ] **Step 6: Typecheck (partial)**

Run: `npm run typecheck:web`
Expected: errors ONLY in files Task 7 and 8 rewrite or delete (`project-reports-tab.tsx`, `reports-card.tsx`, `report-editor-drawer.tsx`, `report-row.tsx`, `use-report-editor.ts`, `report-schema-form.tsx`, `project-detail-content.tsx`). Any other file listed is a caller this plan missed: add it to Task 8.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/api/reports.ts apps/web/components/features/projects/hooks apps/web/components/features/projects/components/project-detail/reports/utils/render-report-pdf.ts apps/web/components/features/projects/components/project-detail/reports/hooks/use-report-render.ts apps/web/components/features/projects/components/project-detail/reports/hooks/use-generate-reports.ts
git commit -m "feat(web): report workspace client, generate-all with page-count guard"
```

---

### Task 7: The Reports tab

**Files:**
- Create: `.../project-detail/reports/constants/report-status.ts`
- Create: `.../project-detail/reports/utils/fact-edit-href.ts`
- Create: `.../project-detail/reports/components/report-status-cards.tsx`
- Create: `.../project-detail/reports/components/report-facts-form.tsx`
- Create: `.../project-detail/reports/components/reports-toolbar.tsx`
- Modify (rewrite): `.../project-detail/tabs/project-reports-tab.tsx`

(`...` = `apps/web/components/features/projects/components`)

**Interfaces:**
- Consumes: Task 6 hooks, `ReportPreviewPanel` (unchanged), `useReportDownload` (unchanged), `DetailCard`, `TonePill`, `Tone` from `../primitives`.
- Produces: `REPORT_STATUS_META`, `factEditHref(editAt, workspace)`, `<ReportStatusCards>`, `<ReportFactsForm>`, `<ReportsToolbar>`; `ProjectReportsTab` keeps its props `{ projectId }`.

- [ ] **Step 1: Status labels**

`reports/constants/report-status.ts`:

```ts
import type { ReportStatus } from '@tejas96/shared/reports';

import type { Tone } from '../../primitives';

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; tone: Tone }> = {
  missing: { label: 'Missing details', tone: 'warning' },
  ready: { label: 'Ready to generate', tone: 'accent' },
  filed: { label: 'Filed', tone: 'success' },
  stale: { label: 'Out of date', tone: 'danger' },
};
```

- [ ] **Step 2: Edit links**

`reports/utils/fact-edit-href.ts`:

```ts
import type { FactEditAt, ReportWorkspace } from '@tejas96/shared/reports';

import { buildRoute, ROUTES } from '@/lib/config/routes';

/** Where a read-only fact lives, so it is changed at its one home. */
export function factEditHref(editAt: FactEditAt, workspace: ReportWorkspace): string {
  switch (editAt) {
    case 'customer':
      return buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: workspace.customerId });
    case 'property':
      return buildRoute(ROUTES.PROPERTIES.DETAIL, { id: workspace.propertyId });
    case 'quote':
      return buildRoute(ROUTES.QUOTES.DETAIL, { id: workspace.quoteId });
    case 'bom':
      return `${buildRoute(ROUTES.PROJECTS.DETAIL, { id: workspace.projectId })}?tab=bom`;
  }
}
```

Check the route names exist: `grep -nE "QUOTES|PROPERTIES|CUSTOMERS" apps/web/lib/config/routes.ts | head`.

- [ ] **Step 3: Status cards**

`reports/components/report-status-cards.tsx`:

```tsx
'use client';

import { Box, ButtonBase, IconButton, Tooltip } from '@mui/material';
import type { WorkspaceReport } from '@tejas96/shared/reports';
import { Download } from 'lucide-react';

import { REPORT_STATUS_META } from '../constants/report-status';
import { useReportDownload } from '../hooks/use-report-download';
import { TonePill } from '../../primitives';

import { formatDate } from '@/lib/utils';

interface ReportStatusCardsProps {
  reports: WorkspaceReport[];
  selectedId: string | null;
  onSelect: (reportId: string) => void;
}

export function ReportStatusCards({ reports, selectedId, onSelect }: ReportStatusCardsProps) {
  const { download, isDownloading } = useReportDownload();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${reports.length}, minmax(0, 1fr))` },
        gap: 1,
      }}
    >
      {reports.map((report) => {
        const meta = REPORT_STATUS_META[report.status];
        const selected = report.id === selectedId;
        return (
          <Box key={report.id} sx={{ position: 'relative' }}>
            <ButtonBase
              onClick={() => onSelect(report.id)}
              aria-pressed={selected}
              sx={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.75,
                p: 1.5,
                borderRadius: 2,
                border: selected ? '2px solid' : '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <span className="pr-7 text-[13px] font-medium leading-tight">{report.name}</span>
              <TonePill label={meta.label} tone={meta.tone} dot />
              <span className="text-[11.5px] text-foreground-tertiary">
                {report.status === 'missing'
                  ? `${report.missing.length} to fill`
                  : report.filed
                    ? `Filed ${formatDate(report.filed.filedAt)}`
                    : 'Not filed yet'}
              </span>
            </ButtonBase>
            {report.filed && (
              <Tooltip title="Download filed copy">
                <IconButton
                  size="small"
                  aria-label={`Download ${report.name}`}
                  disabled={isDownloading}
                  onClick={() =>
                    void download({ fileUrl: report.filed!.fileUrl, fileName: report.filed!.fileName })
                  }
                  sx={{ position: 'absolute', top: 6, right: 6 }}
                >
                  <Download className="size-4" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
```

Check `formatDate` is exported from `@/lib/utils`: `grep -n "export function formatDate\|export const formatDate" -r apps/web/lib/utils* | head -2`. If it lives elsewhere, import it from there.

- [ ] **Step 4: Facts form**

`reports/components/report-facts-form.tsx`:

```tsx
'use client';

import { Box, Button, Link as MuiLink, TextField, Typography } from '@mui/material';
import {
  FACT_GROUPS,
  validateFactValue,
  type ReportWorkspace,
  type WorkspaceFact,
} from '@tejas96/shared/reports';
import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { factEditHref } from '../utils/fact-edit-href';

import { useUpdateReportFacts } from '@/components/features/projects/hooks/use-project-reports';

interface ReportFactsFormProps {
  workspace: ReportWorkspace;
  /** null = every report. */
  reportId: string | null;
  disabled?: boolean;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function ReportFactsForm({ workspace, reportId, disabled }: ReportFactsFormProps) {
  const update = useUpdateReportFacts(workspace.projectId);

  const reportNames = useMemo(
    () => new Map(workspace.reports.map((r) => [r.id, r.name.split(' ')[0]])),
    [workspace.reports],
  );
  const missingKeys = useMemo(
    () =>
      new Set(
        workspace.reports
          .filter((r) => !reportId || r.id === reportId)
          .flatMap((r) => r.missing.map((m) => m.key as string)),
      ),
    [workspace.reports, reportId],
  );
  const visible = workspace.facts.filter((f) => !reportId || f.usedBy.includes(reportId));

  const usedByText = (fact: WorkspaceFact) =>
    fact.usedBy.length === workspace.reports.length
      ? 'All reports'
      : fact.usedBy.map((id) => reportNames.get(id) ?? id).join(', ');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {FACT_GROUPS.map((group) => {
        const facts = visible.filter((f) => f.group === group.id);
        if (facts.length === 0) return null;
        const manual = facts.filter((f) => f.source === 'manual');
        const readOnly = facts.filter((f) => f.source !== 'manual');

        return (
          <Box component="section" key={group.id}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              {group.title}
            </Typography>

            {manual.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                  mb: readOnly.length ? 2 : 0,
                }}
              >
                {manual.map((fact) => (
                  <ManualFactInput
                    key={fact.key}
                    fact={fact}
                    hint={usedByText(fact)}
                    missing={missingKeys.has(fact.key)}
                    disabled={disabled || update.isPending}
                    onCommit={(value) => update.mutate({ [fact.key]: value })}
                  />
                ))}
              </Box>
            )}

            {readOnly.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  columnGap: 2,
                  rowGap: 1.25,
                }}
              >
                {readOnly.map((fact) => (
                  <Box key={fact.key} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {fact.label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        color={fact.value ? 'text.primary' : missingKeys.has(fact.key) ? 'warning.main' : 'text.secondary'}
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {fact.value || 'Not set'}
                      </Typography>
                      {fact.editAt && (
                        <MuiLink
                          component={NextLink}
                          href={factEditHref(fact.editAt, workspace)}
                          variant="caption"
                          sx={{ flexShrink: 0 }}
                        >
                          Edit
                        </MuiLink>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

interface ManualFactInputProps {
  fact: WorkspaceFact;
  hint: string;
  missing: boolean;
  disabled?: boolean;
  onCommit: (value: string | null) => void;
}

/** Saves on blur. A value that fails its rule is shown and never sent. */
function ManualFactInput({ fact, hint, missing, disabled, onCommit }: ManualFactInputProps) {
  const [draft, setDraft] = useState(fact.value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(fact.value), [fact.value]);

  const commit = (raw: string) => {
    const value = raw.trim();
    if (value === fact.value) {
      setError(null);
      return;
    }
    const message = validateFactValue(fact, value);
    setError(message);
    if (!message) onCommit(value === '' ? null : value);
  };

  return (
    <TextField
      size="small"
      fullWidth
      label={fact.label}
      type={fact.type === 'date' ? 'date' : 'text'}
      multiline={fact.type === 'textarea'}
      minRows={fact.type === 'textarea' ? 2 : undefined}
      placeholder={fact.placeholder}
      value={draft}
      disabled={disabled}
      required={missing}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(draft)}
      error={!!error || (missing && !draft.trim())}
      helperText={error ?? (missing && !draft.trim() ? `Required · ${hint}` : hint)}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: {
          inputMode: fact.type === 'number' || fact.type === 'year' ? 'decimal' : undefined,
        },
        input:
          fact.type === 'date'
            ? {
                endAdornment: (
                  <Button
                    size="small"
                    disabled={disabled}
                    onClick={() => {
                      const today = todayIso();
                      setDraft(today);
                      commit(today);
                    }}
                  >
                    Today
                  </Button>
                ),
              }
            : undefined,
      }}
    />
  );
}
```

- [ ] **Step 5: Toolbar**

`reports/components/reports-toolbar.tsx`:

```tsx
'use client';

import { Box, Button, CircularProgress, MenuItem, TextField } from '@mui/material';
import type { WorkspaceReport } from '@tejas96/shared/reports';
import { Eye, FileDown, Pencil } from 'lucide-react';

export const ALL_REPORTS = 'all';

interface ReportsToolbarProps {
  reports: WorkspaceReport[];
  picked: string;
  onPick: (value: string) => void;
  mode: 'edit' | 'preview';
  onToggleMode: () => void;
  onGenerate: () => void;
  generating: boolean;
  runningName: string | null;
  canGenerate: boolean;
}

export function ReportsToolbar({
  reports,
  picked,
  onPick,
  mode,
  onToggleMode,
  onGenerate,
  generating,
  runningName,
  canGenerate,
}: ReportsToolbarProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <TextField
        select
        size="small"
        value={picked}
        onChange={(e) => onPick(e.target.value)}
        sx={{ minWidth: 220 }}
        slotProps={{ htmlInput: { 'aria-label': 'Report' } }}
      >
        <MenuItem value={ALL_REPORTS}>All reports ({reports.length})</MenuItem>
        {reports.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {r.name}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ flex: 1 }} />
      <Button
        variant="outlined"
        startIcon={mode === 'edit' ? <Eye className="size-4" /> : <Pencil className="size-4" />}
        onClick={onToggleMode}
        disabled={generating}
      >
        {mode === 'edit' ? 'Preview' : 'Edit details'}
      </Button>
      <Button
        variant="contained"
        startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <FileDown className="size-4" />}
        onClick={onGenerate}
        disabled={generating || !canGenerate}
      >
        {generating
          ? `Filing ${runningName ?? ''}…`
          : picked === ALL_REPORTS
            ? 'Generate all'
            : 'Generate'}
      </Button>
    </Box>
  );
}
```

- [ ] **Step 6: The tab**

Replace `tabs/project-reports-tab.tsx`:

```tsx
'use client';

import { Alert, Box } from '@mui/material';
import { useMemo, useState } from 'react';

import { useProjectReports } from '../../../hooks';
import { DetailCard, TonePill } from '../primitives';
import { ReportFactsForm } from '../reports/components/report-facts-form';
import { ReportPreviewPanel } from '../reports/components/report-preview-panel';
import { ReportStatusCards } from '../reports/components/report-status-cards';
import { ALL_REPORTS, ReportsToolbar } from '../reports/components/reports-toolbar';
import { useGenerateReports } from '../reports/hooks/use-generate-reports';
import { useReportRender } from '../reports/hooks/use-report-render';

import { Skeleton } from '@/components/ui/skeleton';
import { useGatedAction } from '@/lib/rbac';

interface ProjectReportsTabProps {
  projectId: string;
}

/**
 * The DISCOM paperwork. Every fact is typed once here and printed by every
 * report that needs it; facts that live on the customer, property, quote or
 * BOM are shown read-only with a link to where they are changed.
 */
export function ProjectReportsTab({ projectId }: ProjectReportsTabProps): React.JSX.Element {
  const workspaceQuery = useProjectReports(projectId);
  const workspace = workspaceQuery.data;
  const [picked, setPicked] = useState<string>(ALL_REPORTS);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const { generate, runningId, outcomes, clearOutcomes } = useGenerateReports(projectId);

  const reports = workspace?.reports ?? [];
  const pickedId = picked === ALL_REPORTS ? null : picked;

  const previewId =
    pickedId ?? reports.find((r) => r.status !== 'filed')?.id ?? reports[0]?.id ?? null;
  const previewReport = reports.find((r) => r.id === previewId);
  const render = useReportRender(
    projectId,
    mode === 'preview' ? previewId : null,
    workspaceQuery.dataUpdatedAt,
  );

  const targets = useMemo(
    () => (pickedId ? reports.filter((r) => r.id === pickedId) : reports.filter((r) => r.status !== 'filed')),
    [pickedId, reports],
  );

  const runGenerate = useGatedAction(
    'projects.edit',
    () => {
      clearOutcomes();
      void generate(targets);
    },
    'Generate reports',
  );

  const pendingCount = workspace?.pendingCount ?? 0;

  return (
    <DetailCard
      label="Reports"
      aside={workspace ? `${reports.length - pendingCount} of ${reports.length} filed` : undefined}
      action={
        workspace ? (
          pendingCount > 0 ? (
            <TonePill label={`${pendingCount} still to file`} tone="warning" dot />
          ) : (
            <TonePill label="All filed" tone="success" dot />
          )
        ) : null
      }
      isError={workspaceQuery.isError}
      onRetry={() => void workspaceQuery.refetch()}
      errorHeight={200}
    >
      {workspaceQuery.isLoading || !workspace ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ReportsToolbar
            reports={reports}
            picked={picked}
            onPick={setPicked}
            mode={mode}
            onToggleMode={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
            onGenerate={runGenerate.onGatedClick}
            generating={runningId !== null}
            runningName={reports.find((r) => r.id === runningId)?.name ?? null}
            canGenerate={targets.length > 0}
          />

          <ReportStatusCards
            reports={reports}
            selectedId={pickedId}
            onSelect={(id) => setPicked((current) => (current === id ? ALL_REPORTS : id))}
          />

          {outcomes.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {outcomes.map((o) => (
                <Alert key={o.reportId} severity={o.ok ? 'success' : 'warning'} sx={{ py: 0 }}>
                  <strong>{o.name}</strong> — {o.message}
                </Alert>
              ))}
            </Box>
          )}

          {mode === 'edit' ? (
            <ReportFactsForm workspace={workspace} reportId={pickedId} disabled={runningId !== null} />
          ) : (
            <Box sx={{ height: 'min(80vh, 1200px)', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {previewReport?.pages && (
                <p className="text-[12px] text-foreground-secondary">
                  {previewReport.name} must print on exactly {previewReport.pages} pages. Generate
                  checks this and files nothing if it does not.
                </p>
              )}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ReportPreviewPanel html={render.data?.html ?? ''} loading={render.isFetching} />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </DetailCard>
  );
}
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck:web`
Expected: remaining errors only in `reports-card.tsx`, `report-editor-drawer.tsx`, `report-row.tsx`, `use-report-editor.ts`, `report-schema-form.tsx` (Task 8).

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/features/projects/components/project-detail/reports apps/web/components/features/projects/components/project-detail/tabs/project-reports-tab.tsx
git commit -m "feat(web): one Reports workspace — status cards, shared facts form, preview, generate"
```

---

### Task 8: Overview card, delete the drawer, drop the old shared schema

**Files:**
- Modify (rewrite): `.../project-detail/tabs/overview/reports-card.tsx`
- Modify: `.../project-detail/project-detail-content.tsx` (only if typecheck flags it)
- Delete: `.../project-detail/reports/components/{report-editor-drawer,report-editor-footer,report-schema-form,report-row}.tsx`, `.../project-detail/reports/hooks/use-report-editor.ts`
- Delete: `libs/shared/src/reports/schemas/`, `libs/shared/src/reports/report-catalog.ts`, `libs/shared/src/reports/utils/{empty-view-model,validate-report-fields,report-completeness}.ts`
- Modify: `libs/shared/src/reports/index.ts`

**Interfaces:**
- Consumes: `ReportWorkspace`, `REPORT_STATUS_META`.
- Produces: `ReportsCard` with props `{ reports: Panel<ReportWorkspace>; projectPath: string; className?: string }` (`projectId` removed: it opened the drawer).

- [ ] **Step 1: Overview card**

Replace `tabs/overview/reports-card.tsx`:

```tsx
'use client';

import type { ReportWorkspace } from '@tejas96/shared/reports';
import { FileCheck2 } from 'lucide-react';
import NextLink from 'next/link';

import { plural } from '../../lib/derive';
import { CardLink, DetailCard, EmptyPane, Mono, TonePill, Track } from '../../primitives';
import { REPORT_STATUS_META } from '../../reports/constants/report-status';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';

interface ReportsCardProps {
  reports: Panel<ReportWorkspace>;
  projectPath: string;
  className?: string;
}

/**
 * The DISCOM paperwork still outstanding — only what is not filed or is out
 * of date. The Reports tab holds the full set; this card links there.
 */
export function ReportsCard({ reports, projectPath, className }: ReportsCardProps): React.JSX.Element {
  const all = reports.data?.reports ?? [];
  const outstanding = all.filter((r) => r.status !== 'filed');
  const filedCount = all.length - outstanding.length;
  const donePct = all.length > 0 ? (filedCount / all.length) * 100 : 0;
  const tabHref = `${projectPath}?tab=reports`;

  return (
    <DetailCard
      label="Reports"
      aside={reports.data ? `${filedCount} of ${all.length} filed` : undefined}
      action={<CardLink href={tabHref}>All reports</CardLink>}
      isError={reports.isError}
      onRetry={reports.refetch}
      className={className}
    >
      {reports.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-1.5 w-full rounded-pill" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 pb-3">
            <Track pct={donePct} tone={donePct >= 100 ? 'success' : 'accent'} height={6} />
            <Mono className="shrink-0 text-[12px] font-medium text-foreground-secondary">
              {Math.round(donePct)}%
            </Mono>
          </div>

          {outstanding.length === 0 ? (
            <EmptyPane
              icon={<FileCheck2 className="size-4" strokeWidth={2} />}
              tone="success"
              title="Every report is filed"
              description="The DISCOM submission pack for this project is complete."
            />
          ) : (
            <>
              <p className="pb-1 text-[11.5px] text-foreground-tertiary">
                {outstanding.length} {plural(outstanding.length, 'report')} still to file
              </p>
              {outstanding.map((report) => {
                const meta = REPORT_STATUS_META[report.status];
                return (
                  <NextLink
                    key={report.id}
                    href={tabHref}
                    className="flex items-center justify-between gap-3 rounded-lg py-2 hover:bg-surface-hover"
                  >
                    <span className="truncate text-[13px]">{report.name}</span>
                    <TonePill label={meta.label} tone={meta.tone} dot />
                  </NextLink>
                );
              })}
            </>
          )}
        </>
      )}
    </DetailCard>
  );
}
```

If `hover:bg-surface-hover` is not a class in this Tailwind config (`grep -rn "surface-hover" apps/web/tailwind.config.* apps/web/app/globals.css | head -2`), use the hover class `report-row.tsx` used before deleting it.

- [ ] **Step 2: Fix the card's caller**

Run: `grep -rn "<ReportsCard" apps/web/components`
Remove the `projectId=` prop at each call site.

- [ ] **Step 3: Delete the old web pieces**

```bash
cd apps/web/components/features/projects/components/project-detail/reports
git rm components/report-editor-drawer.tsx components/report-editor-footer.tsx components/report-schema-form.tsx components/report-row.tsx hooks/use-report-editor.ts
cd -
```

- [ ] **Step 4: Drop the old shared schema**

```bash
cd libs/shared/src/reports
git rm -r schemas report-catalog.ts utils/empty-view-model.ts utils/validate-report-fields.ts utils/report-completeness.ts
cd -
```

Rewrite `libs/shared/src/reports/index.ts`:

```ts
export * from './definitions';
export * from './facts/report-facts';
export * from './facts/validate-fact';
export * from './report-context';
export * from './status';
export * from './workspace.types';
export * from './templates/quote-pdf.template';
export * from './templates/quote-pdf.types';
```

- [ ] **Step 5: Find every remaining user of removed names**

Run:
```bash
grep -rnE "REPORT_CATALOG|getReportSchema|ReportSchema\b|getReportCompleteness|ReportCompletenessItem|ReportsPendingSummary|WCR_SCHEMA|DCR_SCHEMA|_DEFAULT_FIELDS|ViewModel\b|ProjectReportsData|report-editor-drawer|ReportRow\b" apps libs --include=*.ts --include=*.tsx | grep -v node_modules
```
Expected: no output. For each hit, switch to `REPORT_DEFINITIONS` / `ReportWorkspace`. `ReportContextDto` in `report-context.ts` stays only if something still imports it: `grep -rn "ReportContextDto\|ReportEngineContext" apps libs --include=*.ts | grep -v node_modules`; if nothing does, delete `report-context.ts` and its export line.

- [ ] **Step 6: Full typecheck and lint**

Run: `npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web`
Expected: exit 0.
Run: `npx nx lint web && npx nx lint backend && npx nx lint shared`
Expected: no errors (warnings that existed on `main` are fine). If the shared lint project has another name, `npx nx show projects`.
Run: `npx knip --include files,exports 2>/dev/null | grep -i report`
Expected: nothing report-related left unused (the 21 duplicated root deps knip flags in oneohm are known and ignored).

- [ ] **Step 7: Commit**

```bash
git add -A apps/web/components/features/projects libs/shared/src/reports
git commit -m "refactor(reports): remove the per-report drawer and schemas"
```

---

### Task 9: Projects list badge

**Files:**
- Create: `apps/web/components/features/projects/components/reports-pending-chip.tsx`
- Modify: `apps/web/components/features/projects/components/project-list-page.tsx`

**Interfaces:**
- Consumes: `useReportsPending(projectIds)` (Task 6).
- Produces: `ReportsPendingChip({ count })`; list rows carry `reportsPending?: number`.

- [ ] **Step 1: Chip**

`reports-pending-chip.tsx`, mirroring `ActiveTicketsChip`:

```tsx
import { type JSX } from 'react';

import { CrmStatusPill } from '@/components/shared/crm-table';

export function ReportsPendingChip({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <CrmStatusPill label={`${count} report${count === 1 ? '' : 's'} pending`} tone="warning" dot />
  );
}
```

- [ ] **Step 2: Fetch for visible active and completed rows**

In `project-list-page.tsx`:

Imports: add `import { ReportsPendingChip } from './reports-pending-chip';` and `useReportsPending` to the existing `from '../hooks'` import (export it from the hooks barrel if needed: `grep -n "use-project-reports" apps/web/components/features/projects/hooks/index.ts`). Import `ProjectStatus` from `@tejas96/shared/types` if the file does not already.

Directly after the `tableRows` memo (line 837–840):

```tsx
  // Paperwork is owed once work has started; planning, on-hold and cancelled
  // projects would only add noise to a badge people are meant to act on.
  const reportProjectIds = useMemo(
    () =>
      tableRows
        .filter((row) => row.status === ProjectStatus.ACTIVE || row.status === ProjectStatus.COMPLETED)
        .map((row) => row.id),
    [tableRows],
  );
  const { data: reportsPending } = useReportsPending(reportProjectIds);
  const rowsWithReports = useMemo<ProjectRow[]>(
    () =>
      reportsPending
        ? tableRows.map((row) => ({ ...row, reportsPending: reportsPending[row.id] ?? 0 }))
        : tableRows,
    [tableRows, reportsPending],
  );
```

In the `<CrmTable<ProjectRow>` props, change `rows={tableRows}` to `rows={rowsWithReports}`.

In the `projectNumber` column's `renderCell`, directly after `<ActiveTicketsChip count={project.activeTicketCount} />`:

```tsx
            <ReportsPendingChip count={(row.reportsPending as number | undefined) ?? 0} />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck:web` → exit 0.

- [ ] **Step 4: Verify in the browser**

Open `/projects` with the Active filter. Expected: rows of active projects show "N reports pending"; planning projects show no chip. In the Network panel (`read_network_requests`, filter `reports/pending`): one request per page, body holds only active/completed ids, response maps id → count. Open one flagged project: its Reports tab's "N still to file" equals the list's N.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/features/projects/components/reports-pending-chip.tsx apps/web/components/features/projects/components/project-list-page.tsx apps/web/components/features/projects/hooks
git commit -m "feat(web): pending report badge on the projects list"
```

---

### Task 10: Walk the whole flow and clean up

**Files:** none changed unless a check fails.

Run every check through the UI (user rule). Keep a short log of pass/fail per check as you go; at most 2 retries per failing check, then stop and report.

- [ ] **Step 1: Fresh servers**

Stop and restart `backend` and `web` with `preview_start` (restart before trusting any console error).

- [ ] **Step 2: Aadhaar end to end**

Onboard a test customer "QA-0923 Report Test" with Aadhaar `123412341234`, property type Residential, a consumer number and sanctioned load, and take it through to a project (quote → project) the way the app normally does. Note the project id.

- [ ] **Step 3: One entry, every report**

Open the project → Reports. Pick "All reports". Type Sanction number `63436547`, Sanction date via Today, Earthing `3 - 3Ω, 4Ω, 3Ω`, CMC period `5`, Application number `APP-1`, Agreement date via Today, Signatory (licensee) `QA Officer`, Signatory name/designation `QA Signer` / `Director`. Blur each field.
Expected: no field is asked twice; after each blur the status cards update without reload. Type `2031` in inverter year: inline error "must be a year between 2000 and 2026", nothing saved (reload the tab: the old value is back).

- [ ] **Step 4: WCR preview**

Pick WCR → Preview. Expected, by screenshot: centered title "Work Completion Report for Solar Power Plant", subtitle "Oneohm Sustainable Green Energy Private Limited", no header bar; HPD "Not applicable"; Category "Residential"; row 5 "63436547 dated <today DD-MM-YYYY>"; bold vendor legal name under the left line and the consumer name under the right line, roles below; page 2 titled "Guarantee Certificate Undertaking", no "free of cost" anywhere (`find` for "free of cost" in the preview returns nothing); "Identity details of consumer: QA-0923 Report Test"; Aadhaar `1234 1234 1234`.

- [ ] **Step 5: Generate all**

Back to Edit → "All reports" → Generate all.
Expected: each report files one after another; the result list says "Filed" for all four; cards turn Filed; the tab pill reads "All filed". Download the WCR from its card and open it: exactly 2 pages. If the WCR reports "came out as 3 pages", tighten `wcr.hbs` spacing (table cell padding, `.text-block` margin, `.sig-space` height) and re-run; do not raise `pages`.

- [ ] **Step 6: Out of date**

Open the property (Edit link on "Sanctioned capacity"), change the sanctioned load, save, come back to Reports.
Expected: WCR and Annexure show "Out of date" (they print that fact); DCR and NMA stay Filed. `/projects` shows this project with "2 reports pending". Generate all again → both back to Filed, badge gone.

- [ ] **Step 7: Missing blocks filing**

Clear Earthing details (empty, blur). Expected: WCR shows "Missing details · 1 to fill", the field is marked required, and Generate all lists "Work Completion Report — Skipped — missing Earthing details" while the other reports are untouched.

- [ ] **Step 8: Clean up test data**

Local uploads went to the production bucket. Through the UI: delete the test project's filed report documents (Documents tab) and then the test project, property and customer as the app allows. Confirm with the user before deleting anything that was not created in this run.

- [ ] **Step 9: Final commit (only if Step 5 needed template tuning)**

```bash
git add apps/backend/src/modules/reports/definitions/wcr/templates/wcr.hbs
git commit -m "fix(reports): fit WCR page 1 on one A4 page"
```
