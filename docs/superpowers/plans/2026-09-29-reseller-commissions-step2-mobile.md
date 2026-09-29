# Reseller Commissions — Step 2 (EPC mobile app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the EPC Android app its reseller screens — his money card and dashboard, a read-only project, a quote screen without cost or margin, "Your commission at this price" — and give staff the "Which reseller?" picker the server now requires.

**Architecture:** The app learns "this user is a reseller" from `GET /employees/me` (`profileKind`). That flag only decides what to DRAW; the Step 1 server wall already decides what he can GET. New data comes from one route, `GET /commissions/me?period=`. Everything follows the house patterns: `endpoints`, `queryKeys`, `buildFilters`, `useQuery` hooks in `features/<x>/api`, screens registered in `src/app/routes.tsx`.

**Tech Stack:** React Native 0.7x, TypeScript, React Navigation (static API), TanStack Query v5, Zustand session store, `@tejas96/shared`.

**Spec:** `oneohm/docs/superpowers/specs/2026-09-28-reseller-commissions-design.md` — §2 (D10–D13, X6, X8, X9), §3, §6.1 (reseller words), §10.4, §11, §12, §13 (edge cases 34, 35, 45–49), §15 (mobile walk).

**Repo / branch:** `/Volumes/works-space/oneohm/oneohm-mobile`, new branch `feat/reseller-screens` from `origin/main` (v1.21.0). The server is Step 1: `/Volumes/works-space/oneohm/oneohm` on `feat/reseller-commissions`, run locally on :8085.

## Global Constraints

- **No new unit test files.** Verify by `npx tsc --noEmit`, `npx eslint <touched files>`, the existing `npx jest`, and by running the screen on the Android emulator against local 8085.
- **Do not run prettier on the whole repo.** `npx eslint --fix <touched files>` only.
- **The app hides; the server enforces.** Never add a client-only "security" check and call it done. Never show a reseller cost, margin, the discount ceiling, or anything derived from `profitabilityAmount`.
- **Money:** `/commissions/me` returns **paise** (`…Paise` fields). `formatInr` takes **rupees**. Always `formatInr(paise / 100)`.
- **Reseller identity:** `employeeProfile.profileKind === 'reseller'` from `GET /employees/me`. Use `EmployeeProfileKind.RESELLER` from `@tejas96/shared/types`.
- **Reseller ids:** `customer_profiles.reseller_id` is an **`employee_profiles.id`** (row `id`), never a `users.id`. Assignee fields stay `users.id`.
- **Staff see no change** except: people pickers no longer list resellers, and Lead source "Reseller" now needs "Which reseller?".
- **Reseller words** (spec §6.1): pending / needs_amount → "Pending"; on_hold → "On hold"; waiting_for_project / approved / payment_in_review → "Approved"; paid → "Paid on {date} · {reference}" (drop " · {reference}" when null); to_recover → "Cancelled — owed back {₹amount}"; recovered → "Cancelled — settled"; cancelled → "Cancelled".
- **Win rate** `null` → "—". Never "0%" or "NaN" (§13.45).
- **Copy style:** short, plain sentences, no jargon, no exclamation marks. Match the existing screen voice.
- House patterns first: grep how an existing feature solves it before inventing a shape.
- Do not push, do not open a PR. Commit per task on `feat/reseller-screens`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/core/auth/types.ts` | modify | `EmployeeProfile` gains `profileKind`, `commissionPercentage` |
| `src/core/auth/session.store.ts` | modify | `useIsReseller()`, `useMyCommissionRate()` |
| `src/core/api/endpoints.ts` | modify | `commissions.me` |
| `src/core/query/keys.ts` | modify | `queryKeys.commissions` |
| `src/core/query/filters.ts` | modify | `commissionsMe: { allowed: ['period'] }` |
| `src/features/leads/api/references.api.ts` | modify | staff pickers send `profileKind=staff`; new `useResellers()`; `useAllPeople()` for name lookups |
| `src/features/leads/components/pickers.tsx` | modify | `StaffPicker` shows "Me" for a reseller; new `ResellerPicker` |
| `src/features/leads/record/leadRecord.api.ts` | modify | `useAssigneeNames` uses `useAllPeople` |
| `src/features/leads/model/leadForm.ts` | modify | `CustomerDraft.resellerId`, `resellerName` |
| `src/features/leads/model/validate.ts` | modify | Reseller source needs a reseller |
| `src/features/leads/api/payloads.ts` | modify | send `resellerId` |
| `src/features/leads/components/personSteps.tsx` | modify | "Which reseller?" field; reseller user sees no source chips |
| `src/features/leads/screens/NewLeadScreen.tsx` | modify | open the reseller sheet; clear the reseller when source changes |
| (error copy files found by grep in Task 4) | modify | show the server's reason for 400s |
| `src/features/quotes/components/priceSections.tsx` | modify | no cost/margin reveal for a reseller; commission line |
| `src/features/quotes/components/underPrice.tsx` | modify | `ceiling: number \| null` (null = set by the office) |
| `src/features/quotes/components/PriceScreen.tsx` | modify | pass the reseller props through |
| `src/features/quotes/screens/CreateQuoteRoute.tsx` | modify | no ceiling, no auto-clear, friendly cap refusal for a reseller |
| `src/features/projectDetail/screens/ProjectDetailScreen.tsx` | modify | read-only for a reseller |
| `src/features/commissions/model/types.ts` | create | `/commissions/me` response types |
| `src/features/commissions/model/words.ts` | create | state → reseller words, row line text |
| `src/features/commissions/api/queries.ts` | create | `useMyCommissions(period)` |
| `src/features/commissions/components/MoneyCard.tsx` | create | My Day money card |
| `src/features/commissions/screens/ResellerDashboardScreen.tsx` | create | the dashboard |
| `src/features/myday/screens/MyDayScreen.tsx` | modify | card in all three states |
| `src/features/myday/api/refresh.ts` | modify | pull-to-refresh refetches commissions |
| `src/app/routes.tsx` | modify | register `ResellerDashboard` in `MyDayStack` |
| `src/features/profile/model/types.ts`, `fields.ts`, `components/ProfileRecord.tsx` | modify | reseller's own rate and bank last 4 |

---

### Task 1: Reseller identity, commission endpoint, keys

**Files:**
- Modify: `src/core/auth/types.ts` (`EmployeeProfile`, ~line 38)
- Modify: `src/core/auth/session.store.ts` (hooks near `useEmployeeProfileId`, ~line 233)
- Modify: `src/core/api/endpoints.ts`
- Modify: `src/core/query/keys.ts`
- Modify: `src/core/query/filters.ts`

**Interfaces:**
- Produces: `useIsReseller(): boolean`, `useMyCommissionRate(): number | null`, `endpoints.commissions.me`, `queryKeys.commissions.all()`, `queryKeys.commissions.me(period)`, filter endpoint name `'commissionsMe'`.

- [ ] **Step 1: Extend `EmployeeProfile`.** In `src/core/auth/types.ts` add to the type:

```ts
import type { EmployeeProfileKind } from '@tejas96/shared/types';
// …inside EmployeeProfile:
  /**
   * `staff` or `reseller`. Decides what the app DRAWS for this person; the
   * server has already decided what they can GET (reseller wall, spec §7).
   */
  profileKind?: EmployeeProfileKind;
  /** A reseller's own rate, in percent. Null or absent when not set. */
  commissionPercentage?: number | string | null;
```

- [ ] **Step 2: Add the hooks** in `session.store.ts`, next to `useEmployeeProfileId`:

```ts
/** True when the signed-in person is a reseller (employee_profiles.profile_kind). */
export function useIsReseller(): boolean {
  return useSessionStore(
    state => state.employeeProfile?.profileKind === EmployeeProfileKind.RESELLER,
  );
}

/** The reseller's own commission rate in percent, or null when none is set. */
export function useMyCommissionRate(): number | null {
  return useSessionStore(state => {
    const raw = state.employeeProfile?.commissionPercentage;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  });
}
```

Check how `loadIdentities` stores `/employees/me` into `employeeProfile` (~line 101). If it copies named fields instead of the whole object, add `profileKind` and `commissionPercentage` to that copy.

- [ ] **Step 3: Endpoint.** In `endpoints.ts` add a `commissions` group, with the house comment style:

```ts
  commissions: {
    /**
     * GET `?period=month|fy|all`. The signed-in reseller's own header, summary
     * and commission rows. Money is in PAISE. 404 for anyone who is not a reseller.
     */
    me: '/commissions/me',
  },
```

- [ ] **Step 4: Keys and filters.** In `keys.ts`:

```ts
  commissions: {
    all: () => ['commissions'] as const,
    me: (period: string) => ['commissions', 'me', period] as const,
  },
```

In `filters.ts` add an `EndpointSpec` entry named `commissionsMe` with `allowed: ['period']`, copying the shape of the smallest existing entry.

- [ ] **Step 5: Check.** Run `npx tsc --noEmit` and `npx eslint --fix` on the five files. Expected: clean.

- [ ] **Step 6: Commit.** `git commit -m "feat(reseller): know a reseller from /employees/me; commissions endpoint"`

---

### Task 2: People pickers — resellers out, "Me" in, and a reseller picker

**Files:**
- Modify: `src/features/leads/api/references.api.ts` (`useStaff`, ~lines 100–140)
- Modify: `src/features/leads/components/pickers.tsx` (`StaffPicker`, ~line 267)
- Modify: `src/features/leads/record/leadRecord.api.ts` (`useAssigneeNames`, ~line 358)

**Interfaces:**
- Consumes: `useIsReseller`, `useCurrentUserId` (session store).
- Produces: `useResellers(): UseQueryResult<{ items: ResellerOption[]; truncated: boolean }>`, `type ResellerOption = { id: string; name: string; code: string | null }` (id = `employee_profiles.id`), `useAllPeople()` (same return shape as `useStaff`), `<ResellerPicker visible selectedId onDismiss onSelect />`.

Why: QA M3b — the staff owner picker listed resellers, and picking one on a non-reseller customer got a 400. QA M8 — a reseller's own picker (server returns staff only) had no way to pick himself again.

- [ ] **Step 1: Staff only for pickers.** In `useStaff` add `profileKind: 'staff'` to `params` and change the key to `['employees', 'active', 'staff']`.

- [ ] **Step 2: `useAllPeople`** for name lookups (a site may still be assigned to a reseller). Same body as the old `useStaff` (no `profileKind`), key `['employees', 'active', 'all']`. Make `useAssigneeNames` call `useAllPeople()` instead of `useStaff()`. Extract the shared fetch into one local function so the two hooks do not duplicate code:

```ts
async function fetchPeople(profileKind?: 'staff'): Promise<{ items: StaffMember[]; truncated: boolean }> {
  const { data } = await apiClient.get(endpoints.employees.list, {
    params: { status: 'active', limit: STAFF_FETCH_LIMIT, ...(profileKind ? { profileKind } : {}) },
  });
  // …existing row mapping from useStaff, unchanged…
}
```

- [ ] **Step 3: `useResellers`.** Active resellers only (the server applies the §10.4 inactive rule for `profileKind=reseller&status=active`):

```ts
export type ResellerOption = { id: string; name: string; code: string | null };

type ResellerRow = {
  id: string;
  companyName?: string | null;
  companyCode?: string | null;
  user?: { firstName?: string; lastName?: string | null } | null;
};

export function useResellers() {
  return useQuery({
    queryKey: ['employees', 'active', 'reseller'],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.employees.list, {
        params: { status: 'active', profileKind: 'reseller', limit: STAFF_FETCH_LIMIT },
      });
      const rows = (data?.items ?? data?.data ?? data ?? []) as ResellerRow[];
      const total = typeof data?.total === 'number' ? data.total : rows.length;
      const items: ResellerOption[] = rows
        .filter(row => Boolean(row.id))
        .map(row => ({
          id: row.id,
          name:
            row.companyName?.trim() ||
            fullName(row.user?.firstName ?? '', row.user?.lastName ?? undefined) ||
            'Unnamed reseller',
          code: row.companyCode ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { items, truncated: total > rows.length };
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

(`fullName` is in `@/shared/format`.)

- [ ] **Step 4: "Me" for a reseller in `StaffPicker`.** When `useIsReseller()` is true, put one extra `PersonRow` at the top of the list: name "Me", `selected={selectedUserId === currentUserId}`, `onPress` → `onSelect({ userId: currentUserId, name: <his full name from the session user> })`, then `onDismiss()`. It is not filtered by the search box. Staff see no change.

- [ ] **Step 5: `ResellerPicker`.** A new component in `pickers.tsx`, a copy of the `StaffPicker` structure (SheetShell, title, blurb, ErrorState with retry, loading note, on-device `SearchField` filter on name and code, `ScrollView` of `PickRow`s, truncated note):
  - Props: `{ visible: boolean; selectedId?: string; onDismiss: () => void; onSelect: (reseller: ResellerOption) => void }`.
  - Title "Which reseller?". Blurb "They earn the commission when this customer's quote is won."
  - Row title = `name`, meta = `code` (when present).
  - Empty list: `SheetNote` "No active resellers. Ask the office to add one."

- [ ] **Step 6: Check.** `npx tsc --noEmit`, eslint on touched files, `npx jest`. Expected: clean, existing tests pass.

- [ ] **Step 7: Commit.** `git commit -m "feat(reseller): keep resellers out of staff pickers; add reseller picker"`

---

### Task 3: Lead source → "Which reseller?" (staff) and hidden source (reseller)

**Files:**
- Modify: `src/features/leads/model/leadForm.ts` (`CustomerDraft` ~51–72, `emptyCustomer` ~142)
- Modify: `src/features/leads/model/validate.ts` (`validateSource`, ~85)
- Modify: `src/features/leads/api/payloads.ts` (`CustomerPayload` ~21, `toCustomerPayload` ~45)
- Modify: `src/features/leads/components/personSteps.tsx` (`SourceStep`, ~269)
- Modify: `src/features/leads/screens/NewLeadScreen.tsx` (source step ~810; overlays; save-error text ~678)

**Interfaces:**
- Consumes: `ResellerPicker`, `ResellerOption` (Task 2), `useIsReseller` (Task 1).
- Produces: `CustomerDraft.resellerId: string`, `CustomerDraft.resellerName: string`.

Spec: §10.4, §11.3, edge cases 34 and 35. D13: without this, staff on the app cannot save a Reseller-source lead.

- [ ] **Step 1: Draft fields.** Add to `CustomerDraft`, and `''` defaults in `emptyCustomer()`:

```ts
  /** employee_profiles.id of the reseller who sent them. Only with leadSource 'reseller'. */
  resellerId: string;
  /** Display only, for the picker field. Never sent. */
  resellerName: string;
```

When a phone match fills the draft from `MatchedCustomer` (`useLeadWizard.ts` ~200–225), leave both `''`: the customer is not re-saved.

- [ ] **Step 2: Clear on source change (edge case 35).** Wherever `setCustomerField('leadSource', value)` lands (the `onChange` from `SourceStep`), when the new value is not `'reseller'`, also set `resellerId` and `resellerName` to `''`. Do it in the one place the field is set, so no path skips it.

- [ ] **Step 3: Validation (edge case 34).** In `validateSource`:

```ts
  if (c.leadSource === 'reseller' && !c.resellerId) {
    errors['customer.resellerId'] = 'Choose which reseller sent this customer';
  }
```

Skip this rule when the signed-in person is a reseller (the server sets both fields). `validateSource(form)` has no hook access — add a second parameter `options: { isReseller: boolean }` and pass it from the `validateCurrent` switch in `NewLeadScreen.tsx` (~226).

- [ ] **Step 4: Payload.** In `CustomerPayload` add `resellerId?: string`. In `toCustomerPayload`:

```ts
    ...(c.leadSource === 'reseller' && c.resellerId ? { resellerId: c.resellerId } : {}),
```

Create only — nothing else in the app PATCHes a customer. The server ignores `resellerId` from a reseller and forces his own id.

- [ ] **Step 5: `SourceStep` UI.** Add props `isReseller: boolean` and `onOpenResellers: () => void`.
  - **Reseller user:** do not render the source chips or the "Where from?" input. In their place show one line of `styles.hint` text: "You are saved as the source of this lead." Referral code and customer group stay.
  - **Staff, source = Reseller:** right after the chips, render

```tsx
<PickerField
  disabled={locked}
  error={errors['customer.resellerId']}
  label="Which reseller?"
  placeholder="Pick the reseller"
  value={customer.resellerName}
  onPress={onOpenResellers}
/>
```

  - Change the step hint "All of this step is optional." to show only when it is true: for staff with source Reseller, show "Pick the reseller who sent them." instead.

- [ ] **Step 6: Wire the sheet** in `NewLeadScreen.tsx`, the same way the groups overlay is wired (`onOpenGroups` → an overlay state value). Render `<ResellerPicker visible={overlay === 'resellers'} selectedId={form.customer.resellerId} onDismiss={closeOverlay} onSelect={r => { setCustomerField('resellerId', r.id); setCustomerField('resellerName', r.code ? `${r.name} · ${r.code}` : r.name); }} />`. Use the real names of the overlay state and setter you find there.

- [ ] **Step 7: Check.** tsc, eslint, jest.

- [ ] **Step 8: Run it.** On the emulator as staff (RCQA Staff; credentials in `oneohm/.superpowers/sdd/2026-09-28-reseller-commissions-step1/qa-credentials.md`, never paste them in chat or files): add a lead, choose Reseller, try Next without a reseller (the error shows), pick Reseller One, finish. Check with SQL that `customer_profiles.reseller_id` = Reseller One's `employee_profiles.id` and `lead_source = 'reseller'`. Then choose Reseller, pick one, switch to Walk-in, and confirm the field is gone and the saved row has `reseller_id` NULL. Use test phone numbers in the 90000009xx range.

- [ ] **Step 9: Commit.** `git commit -m "feat(reseller): Which reseller? on the lead source step; hidden for resellers"`

---

### Task 4: Show the server's reason, not a network hint

**Files:** found by grep — expected in `src/features/leads/screens/NewLeadScreen.tsx`, `src/features/leads/components/reviewAndFinish.tsx` and the file that holds the text below.

QA M2b: a 400 on customer save showed "Nothing you typed has been lost — try again when you have a bar", which treats a refusal as a bad signal. QA M3b: a follow-up the server refused showed only "Saved, but the follow-up did not book".

- [ ] **Step 1: Find the copy.**

```bash
grep -rn "when you have a bar\|did not book" src/
```

- [ ] **Step 2: Network hint only for network errors.** Wherever the "…when you have a bar" sentence is rendered, render it only when the error is an `ApiError` with `kind === 'network' || kind === 'timeout'`. For every other kind, show the server's text (`error.messages.join('. ')`) and keep "Nothing you typed has been lost." only if the form really keeps its values (it does on this screen — check before keeping the sentence).

- [ ] **Step 3: Say why the follow-up did not book.** Where "did not book" is shown, append the server's reason when the error is an `ApiError` with `kind === 'validation' || kind === 'conflict' || kind === 'forbidden'`: `Saved, but the follow-up did not book: ${error.messages[0]}`. Keep the current text for other kinds.

- [ ] **Step 4: Check.** tsc, eslint, jest.

- [ ] **Step 5: Commit.** `git commit -m "fix(leads): show the server's reason for a refused save"`

---

### Task 5: Quote screen — no cost, margin or ceiling for a reseller

**Files:**
- Modify: `src/features/quotes/components/priceSections.tsx` (`MoneyBlock`, 208–318)
- Modify: `src/features/quotes/components/PriceScreen.tsx` (~114–122)
- Modify: `src/features/quotes/components/underPrice.tsx` (`DiscountSection`, ~42–125)
- Modify: `src/features/quotes/screens/CreateQuoteRoute.tsx` (~349–356 auto-clear; ~747–757 ceiling; ~896–910 footer; ~941 DiscountSection; the save `onError`)

**Interfaces:**
- Consumes: `useIsReseller`.
- Produces: `MoneyBlock` prop `hideCost?: boolean`; `DiscountSection` prop `ceiling: number | null`.

Why: the server strips `profitabilityAmount` for a reseller, so the old reveal said "This discount has taken the whole margin" (QA M9b), and the ceiling (half the margin) would reveal the margin. The server still enforces the cap at save (and audit-logs a reseller's refused discount, §13.40).

- [ ] **Step 1: `MoneyBlock`.** Add `hideCost?: boolean`. When true, do not render the `styles.private` block (the reveal and the "Cost and margin hidden…" row) and do not call `deriveMarginAfterDiscount`. `PriceScreen` passes `hideCost={isReseller}` (read `useIsReseller()` in `CreateQuoteRoute` and pass it down as a prop, same as `marginRevealed`).

- [ ] **Step 2: `DiscountSection` with an unknown ceiling.** Change `ceiling: number` to `ceiling: number | null`. `null` means "the office sets the limit; the server checks it at save":

```ts
  const known = ceiling !== null;
  const overCeiling = known && typed > ceiling;
  const unavailable = known && ceiling <= 0;
```

  - Head row text: known → as today; unknown → `'set by the office'`.
  - Presets: `disabled={known && preset > ceiling}`.
  - Under the input, when unknown and `typed > 0`, keep the "Why the total dropped…" block as today, and add one helper line: "If this is more than the office allows, you will be told when you save."

- [ ] **Step 3: `CreateQuoteRoute`.**
  - `const ceiling = isReseller ? null : discountCeiling(calculation);`
  - `const discountOverCeiling = ceiling !== null && discount > ceiling;`
  - The auto-clear effect (~349): return early when `isReseller` (add `isReseller` to its deps).
  - Save error for a reseller: when the `ApiError` message is `'Discount cannot exceed 50% of the margin'`, show "This discount is more than this quote can carry. Try a smaller one." instead (a reseller must never read the word "margin" in front of a customer). Staff keep the server text.

- [ ] **Step 4: Check.** tsc, eslint, jest.

- [ ] **Step 5: Run it.** As Reseller One on his customer's site: price a quote. No "Cost and margin" row. Discount head says "set by the office". Type ₹1,000 → total drops, save works (`quotes.reseller_id` = his profile). Type a very large discount → save refused with the friendly line. As staff: the reveal, the "up to ₹X" ceiling and the over-ceiling block behave exactly as before.

- [ ] **Step 6: Commit.** `git commit -m "feat(reseller): quote screen hides cost, margin and the discount ceiling"`

---

### Task 6: "Your commission at this price"

**Files:**
- Modify: `src/features/quotes/components/priceSections.tsx` (`MoneyBlock`)
- Modify: `src/features/quotes/components/PriceScreen.tsx`
- Modify: `package.json`, `package-lock.json` (only if Step 1 below applies)

**Interfaces:**
- Consumes: `useMyCommissionRate` (Task 1), `QuoteMoney.taxableAmount` (the discounted base before tax — the same number the server freezes as the commission base, spec §5), `hideCost` from Task 5.
- Produces: nothing new for later tasks.

- [ ] **Step 1: The maths helper.** The single source is `commissionAmount(base, ratePercent)` in `oneohm/libs/shared/src/utils/commission.ts` (integer paise × basis points, half-up). It is not in the published `@tejas96/shared` yet.
  - **If the controller says the shared package with `commissionAmount` is published:** bump `@tejas96/shared` in `package.json` to that version, `npm install` with `GITHUB_PACKAGES_TOKEN` exported from `.env`, confirm with `node -e "console.log(require('./node_modules/@tejas96/shared/package.json').version)"`, and import `commissionAmount` from `@tejas96/shared/utils`. Never hand-copy files into `node_modules`.
  - **Otherwise:** add `src/features/quotes/model/commission.ts` holding an exact copy of `commissionAmount` with this header: `/** Copy of commissionAmount in oneohm libs/shared/src/utils/commission.ts. Replace with the @tejas96/shared import once the version that has it is published. */`. The controller rules which branch applies.

- [ ] **Step 2: The line.** In `MoneyBlock`, when `hideCost` is true, render in the place the reveal used to be:
  - rate known → `MoneyRow` label "Your commission at this price", value `formatInr(commissionAmount(money.taxableAmount, rate))`, and under it a helper line `${rate}% of ${formatInr(money.taxableAmount)}, the price before tax.`
  - rate null → a helper line "Your commission rate is not set yet. Ask the office."
  Pass `rate` from `CreateQuoteRoute` (`useMyCommissionRate()`) through `PriceScreen` as `commissionRate`.

- [ ] **Step 3: Check.** tsc, eslint, jest.

- [ ] **Step 4: Run it.** As Reseller One (rate 4%): the line shows 4% of the taxable amount; change the discount and it moves with it. Save and accept this quote as staff on the web; confirm the new `employee_commissions.commission_amount` equals the number the phone showed.

- [ ] **Step 5: Commit.** `git commit -m "feat(reseller): show his commission at this price"`

---

### Task 7: Project detail is read-only for a reseller

**Files:**
- Modify: `src/features/projectDetail/screens/ProjectDetailScreen.tsx` (YoursSection ~419–430; DocumentList ~507–519; AddDocumentSheet ~575–583; AddFileSheet ~586–591; TaskSheet ~532–573)

Spec D10, X8, §11.3. The server already refuses every write and the project documents list (403). Payments block, phase strip, phase rows, team block (call only), site and system blocks stay.

- [ ] **Step 1:** `const readOnly = useIsReseller();` next to `const offline = useIsOffline()` (~194).
- [ ] **Step 2:** `onOpenTask={offline || readOnly ? undefined : setOpenTask}`.
- [ ] **Step 3:** Do not render `DocumentList`, `AddDocumentSheet`, `AddFileSheet` or `TaskSheet` when `readOnly`. Find the query that loads the project's documents and pass `enabled: !readOnly` (add an `enabled` option to its hook if it has none), so no 403 is fetched.
- [ ] **Step 4: Check.** tsc, eslint, jest.
- [ ] **Step 5: Run it.** As Reseller One, open his project PRJ-…-0246: no documents section, tasks do not open, payments and phases show, no error card. As staff, the same project is unchanged.
- [ ] **Step 6: Commit.** `git commit -m "feat(reseller): project detail is read-only for resellers"`

---

### Task 8: Commissions data + My Day money card

**Files:**
- Create: `src/features/commissions/model/types.ts`
- Create: `src/features/commissions/model/words.ts`
- Create: `src/features/commissions/api/queries.ts`
- Create: `src/features/commissions/components/MoneyCard.tsx`
- Modify: `src/features/myday/screens/MyDayScreen.tsx` (allFailed branch ~190–205, nothingAssigned branch ~207–226, main branch ~257+)
- Modify: `src/features/myday/api/refresh.ts`

**Interfaces:**
- Consumes: Task 1 (`endpoints.commissions.me`, `queryKeys.commissions`, `'commissionsMe'` filter, `useIsReseller`).
- Produces: `type CommissionPeriod = 'month' | 'fy' | 'all'`, `type MyCommissions`, `type MyCommissionRow`, `useMyCommissions(period: CommissionPeriod)`, `resellerStateWords(row: MyCommissionRow): string`, `<MoneyCard />`.

- [ ] **Step 1: Types** (`model/types.ts`), matching `GET /commissions/me` in `oneohm/apps/backend/src/modules/employees/commissions/controllers/employee-commission.controller.ts` (`me`) and `sql/reseller-dashboard.sql.ts` / `sql/commission-read.sql.ts`:

```ts
export type CommissionPeriod = 'month' | 'fy' | 'all';

export type CommissionState =
  | 'pending' | 'needs_amount' | 'on_hold' | 'waiting_for_project' | 'approved'
  | 'payment_in_review' | 'paid' | 'to_recover' | 'recovered' | 'cancelled';

export type MyCommissionRow = {
  id: string;
  quoteId: string;
  quoteNumber: string;
  acceptedAt: string | null;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectNumber: string | null;
  projectStatus: string | null;
  basePaise: number;
  ratePercent: number;
  amountPaise: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paidAt: string | null;
  paymentReference: string | null;
  recoveredAt: string | null;
  cancelReason: string | null;
  state: CommissionState;
};

export type MyCommissionSummary = {
  leads: number;
  quoted: number;
  won: number;
  winRate: number | null;
  revenuePaise: number;
  pendingPaise: number;
  owedPaise: number;
  paidPaise: number;
  toRecoverPaise: number;
  ratePercent: number | null;
};

export type MyCommissions = {
  reseller: { resellerId: string; name: string; code: string | null; ratePercent: number | null };
  summary: MyCommissionSummary;
  commissions: MyCommissionRow[];
  periodStart: string | null;
};
```

- [ ] **Step 2: Hook** (`api/queries.ts`), following `features/myday/api/queries.ts`:

```ts
export function useMyCommissions(period: CommissionPeriod, options: { enabled?: boolean } = {}) {
  const isReseller = useIsReseller();
  return useQuery({
    queryKey: queryKeys.commissions.me(period),
    enabled: isReseller && (options.enabled ?? true),
    retry: 2,
    meta: { silentError: true },
    queryFn: async () => {
      const { data } = await apiClient.get<MyCommissions>(endpoints.commissions.me, {
        params: buildFilters('commissionsMe', { period }),
      });
      return data;
    },
  });
}
```

- [ ] **Step 3: Words** (`model/words.ts`), exactly the Global Constraints table:

```ts
export function resellerStateWords(row: MyCommissionRow): string {
  switch (row.state) {
    case 'pending':
    case 'needs_amount':
      return 'Pending';
    case 'on_hold':
      return 'On hold';
    case 'waiting_for_project':
    case 'approved':
    case 'payment_in_review':
      return 'Approved';
    case 'paid': {
      const when = row.paidAt ? `Paid on ${formatDayMonthYear(row.paidAt)}` : 'Paid';
      return row.paymentReference ? `${when} · ${row.paymentReference}` : when;
    }
    case 'to_recover':
      return `Cancelled — owed back ${formatInr(row.amountPaise / 100)}`;
    case 'recovered':
      return 'Cancelled — settled';
    case 'cancelled':
      return 'Cancelled';
  }
}

/** "₹3,90,000 × 3% = ₹11,700" */
export function commissionSum(row: MyCommissionRow): string {
  return `${formatInr(row.basePaise / 100)} × ${row.ratePercent}% = ${formatInr(row.amountPaise / 100)}`;
}
```

  Tones for a `Badge`: Pending/On hold → `warning`; Approved → `info`; Paid → `success`; any "Cancelled…" → `neutral`, except to_recover → `danger`.

- [ ] **Step 4: `MoneyCard`** (spec §11.1). Renders `null` unless `useIsReseller()`. Uses `useMyCommissions('all')`.
  - Loaded: a `Card` (`density="expressive"`, `onPress` → `navigation.navigate('ResellerDashboard')`, `accessibilityLabel` "Your money. Opens your dashboard."). Overline "YOU ARE OWED", big value `formatInr(owedPaise / 100)`, under it `${formatInr(pendingPaise / 100)} pending approval`, and a chevron.
  - Loading: `SkeletonBlock` at the card's height.
  - Error: a functional `Card` with "Couldn't load your money." and a `Button` "Retry" (`variant="secondary" size="sm"`) calling `refetch()`. The rest of My Day is not affected.
- [ ] **Step 5: Put it on My Day** above everything else in all three branches: inside the `allFailed` return above `<EverythingFailed …>`, inside the `nothingAssigned` return above `<NothingAssigned …>`, and in the main return as the first child of the scroll content. The card's query is NOT part of `useMyDayStatus`, so it never changes the nine-query counts.
- [ ] **Step 6: Pull to refresh.** In `refresh.ts` add `queryClient.refetchQueries({ queryKey: queryKeys.commissions.all() })` to the `Promise.all`.
- [ ] **Step 7: Check.** tsc, eslint, jest.
- [ ] **Step 8: Run it.** As Reseller One: the card shows the same Owed and Pending as `/resellers/<id>` on the web. Pull to refresh updates it. As staff: no card, My Day unchanged. With the backend stopped: the card shows its own retry and My Day shows its normal failure state under it.
- [ ] **Step 9: Commit.** `git commit -m "feat(reseller): money card on My Day"`

---

### Task 9: Reseller Dashboard screen

**Files:**
- Create: `src/features/commissions/screens/ResellerDashboardScreen.tsx`
- Modify: `src/app/routes.tsx` (`MyDayStack`, ~82–230)

**Interfaces:**
- Consumes: `useMyCommissions`, `resellerStateWords`, `commissionSum`, tones (Task 8).
- Produces: route `ResellerDashboard` (no params) in `MyDayStack`, deep link `reseller/dashboard`.

Spec §11.2, §12, §13.45–49.

- [ ] **Step 1: Register** in `MyDayStack`: `ResellerDashboard: { screen: ResellerDashboardScreen, linking: { path: 'reseller/dashboard' } }`. Leave it out of `ORB_SCREENS` (a pushed detail screen, like `MyDayProjectDetail`). Run the existing `__tests__/core/tabBarVisibility.test.ts` to confirm the route tables still agree.

- [ ] **Step 2: Screen layout**, top to bottom, inside `ScreenScaffold` with a `ScreenHeader` titled "Your earnings" and back:
  1. Tiles (`StatCard`, 2 × 2): "Owed" `owedPaise`, "Pending" `pendingPaise`, "Paid so far" `paidPaise`, and "To pay back" `toRecoverPaise` **only when > 0**.
  2. Period chips (`ChipRow` or `Chip`s): "This month" `month`, "This FY" `fy`, "All time" `all`. Default `all` (it shares the My Day card's cached query, so the screen opens instantly).
  3. Funnel line: `${leads} leads → ${quoted} quoted → ${won} won`, then "Win rate {winRate}%" or "Win rate —" when `winRate === null`, then "Business won {formatInr(revenuePaise / 100)}".
  4. One helper line under the chips: "Leads count from the day they were added. Money counts from the day the deal was won."
  5. When the period has no leads and no won deals: "Nothing in this period yet." instead of zeros-only rows (§13.46).
  6. "Your deals" list: one row per commission, newest `acceptedAt` first. Title `customerName`; subtitle `commissionSum(row)`; a `Badge` with `resellerStateWords(row)` and its tone; when `projectStatus` is set, a meta line `Project ${sentenceCase(projectStatus)}`. Tap → `navigation.navigate('MyDayProjectDetail', { projectId })` when `projectId`, else `navigation.navigate('LeadDetail', { customerId })`.
  7. Footer: `Updated ${time}` from the query's `dataUpdatedAt` (`toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })`), plus "· offline" when `useIsOffline()`.
- [ ] **Step 3: States.**
  - Pull to refresh: `RefreshControl` → `refetch()`.
  - First load: `SkeletonList`.
  - Error with no data: `ErrorState` with `onRetry`.
  - Error with cached data (offline, §13.49): keep showing the data and the "Updated" line; no error card.
  - No commissions at all and no leads: `EmptyState` variant `noData`, title "No deals yet", description "Your earnings show here when a customer you sent says yes.", `actionLabel` "Add your first lead" → `navigation.navigate('CreateLeadWizard', { mode: 'create' })`.
- [ ] **Step 4: Check.** tsc, eslint, jest.
- [ ] **Step 5: Run it.** As Reseller One: tiles match `/resellers/<id>` on the web for the same period; switch the three chips and compare funnel and revenue with the web; one row of each state he has (Pending, Approved, Paid, Cancelled — owed back, Cancelled — settled) reads as the table says; tap a row with a project → read-only project; tap one without → the lead. As Reseller Zero (no deals): the empty state and its button open Add lead. Airplane mode after a load: data stays, "· offline" shows.
- [ ] **Step 6: Commit.** `git commit -m "feat(reseller): reseller dashboard screen"`

---

### Task 10: Profile — his own rate and bank last 4

**Files:**
- Modify: `src/features/profile/model/types.ts` (note at 3–15, `MyEmployeeProfile`)
- Modify: `src/features/profile/model/fields.ts`
- Modify: `src/features/profile/components/ProfileRecord.tsx` (~92–170)

Spec §11.3 and §7.2: the server masks `accountNumber` to the last 4 digits for a reseller.

- [ ] **Step 1: Types and the note.** Add `profileKind?`, `commissionPercentage?: number | string | null`, `bankName?: string | null`, `accountNumber?: string | null` to `MyEmployeeProfile`. Rewrite the note: the reseller-only fields are typed now, for one reason — a reseller sees HIS OWN rate and the last 4 digits of HIS OWN account, which the server masks before it leaves; an employee's record never shows them. Keep GSTIN, PAN, IFSC and Aadhaar out of the type.
- [ ] **Step 2: Fields.** In `fields.ts` add `commissionFields(profile)` returning rows: "Commission rate" → `${rate}%` or "Not set — ask the office"; "Paid into" → `${bankName} · account ending ${last4}` (last 4 = the last 4 characters of `accountNumber`), or "No bank details yet — ask the office".
- [ ] **Step 3: Section.** In `ProfileRecord`, when `profileKind === 'reseller'`, render a read-only `PrintedSection` titled "My commission" with those rows, after "My work". Staff: no change.
- [ ] **Step 4: Check.** tsc, eslint, jest.
- [ ] **Step 5: Run it.** As Reseller One: rate 4%, bank line with only 4 digits. As staff: no new section.
- [ ] **Step 6: Commit.** `git commit -m "feat(reseller): profile shows his rate and bank last 4"`

---

### Task 11: The mobile walk (spec §15) and staff regression

No code unless the walk finds a defect (fix it in the task that owns the file, as a new commit).

- [ ] **Step 1:** Local backend on `feat/reseller-commissions` (:8085), Metro, debug APK on Pixel_8_Emulator (`adb reverse tcp:8085 tcp:8085`, see memory `mobile-local-verification`). Blank the outbound keys first if a step can notify (quote share uses "Mark as sent").
- [ ] **Step 2: Reseller walk:** sign in as Reseller One → My Day card (also force the "Nothing assigned" state: Reseller Two has no tasks) → dashboard → a deal → project read-only → his customer's site → quote: no margin, "Your commission", discount "set by the office" → Add lead: no source chips, lead saves with source Reseller and his id → it shows in his Leads list and nobody else's.
- [ ] **Step 3: Staff walk:** sign in as RCQA Staff: My Day has no card; Add lead with source Reseller + picker saves; owner pickers list no resellers; quote reveal and ceiling unchanged; project detail unchanged with documents.
- [ ] **Step 4:** Record results with screenshots in `oneohm/.superpowers/sdd/2026-09-29-reseller-commissions-step2-mobile/qa-results.md`. Restore the env as found.

## Release (after both PRs merge)

Step 1 PR merges and deploys first. The mobile PR then ships; after the release, raise the EPC **min and recommended** versions (Fly secrets on `oneohm-epc-backend`). If Task 6 used the local copy, a follow-up swaps it for the `@tejas96/shared` import once the version with `commissionAmount` is published.
