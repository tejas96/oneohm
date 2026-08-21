# Prompt for Claude Design — OneOhm "My Work" dashboard

> Copy everything below the line into Claude Design. It is self-contained:
> Claude Design cannot see this repository, so every value it needs is written out.
> Companion spec (engineering source of truth): `2026-08-21-dashboard-my-work-design.md`.

---

## What you are designing

A single-page operational dashboard for **OneOhm**, an internal web app used by a
solar EPC company in India. The people using it are employees — sales reps, site
engineers, project coordinators — not customers, not executives.

The page answers one question: **what needs me right now, and where do I click?**

It is a working screen someone opens every morning, not a reporting or analytics
screen. Every row must carry an action. Nothing decorative.

Design the **desktop** view first, then mobile, then the states.

---

## Hard constraints — these are not preferences

The app has a shipped design system. Match it exactly. Do not improve it, modernise
it, or substitute your own palette or type.

### Colour — exact hex, no substitutions

| Role | Hex | Use |
|---|---|---|
| Page canvas | `#FAFAF9` | The background behind cards |
| Card surface | `#FFFFFF` | Cards |
| Sunken / chip fill | `#F5F5F4` | Neutral chips, search field |
| Text primary | `#1C1917` | Titles, numbers |
| Text secondary | `#57534E` | Reason lines, meta, section labels |
| Text tertiary | `#A8A29E` | Dates, faint asides only — never body copy |
| Brand green | `#76C044` | Logo mark only |
| Action fill | `#EEF6E2` | Button background |
| Action text | `#4D7C0F` | Button label, active nav |
| Critical | `#DC2626` on tint `#FDECEC` | Overdue, lapsed, blocked |
| Warning | `#A16207` on tint `#FEF7E6` | Due soon, needs attention |
| Info | `#0369A1` on tint `#E8F4FB` | Active, upcoming |
| Success | `#15803D` on tint `#EAFBEF` | Complete, healthy |
| Link | `#0D74B8` | "View all" links |

**There are four semantic colours, not five.** There is no separate orange and
yellow. "Due soon" and "needs attention" share the warning family. Do not invent a
fifth.

**Never fill a button with `#76C044` and put white text on it.** That pair is
2.24:1 and fails accessibility. Buttons use the `#EEF6E2` / `#4D7C0F` pair.

### Type

Font: **Geist**, fallback Inter, then system sans.

| Step | Size / line height | Weight | Use |
|---|---|---|---|
| Section label | 10 / 14 | 600, uppercase, 0.06em tracking | Block headings |
| Caption | 11 / 16 | 400–600 | Badges, chips, asides |
| Small | 12 / 16 | 400–500 | Reason lines, meta, buttons |
| Body | 13 / 20 | 400–600 | Row titles, nav |
| Large | 16 / 24 | 600 | — |
| Number | 24 / 32 | 600, −0.02em tracking | The three headline figures |
| Greeting | 20 / 28 | 600, −0.01em tracking | "Good morning, …" |

Body is **13px, not 14 or 16**. This is a dense internal tool.

### Shape and depth

- Card radius **12px**. Chip and button radius **999px** (fully round). Row hover
  radius 8px.
- Card shadow at rest: `0 2px 8px rgba(16,24,40,0.05)`. On hover:
  `0 8px 24px rgba(16,24,40,0.06)` plus a 1px lift.
- **Cards carry no borders.** None. The design system's governing rule is that
  hierarchy comes from luminance and softness, never from lines. Do not add a
  border, an outline, or a divider rule between rows. Separation comes from
  spacing, weight and the coloured row edge described below.

### Icons

Inline SVG only, stroke-based, 1.9–2.4 stroke width, on a 16/20/24 grid, one
consistent style. **No emoji. No unicode dingbats** — no ✓, ◐, ⚠, ★. Draw them.

---

## The app shell

The dashboard renders inside fixed chrome. Draw it so the design reads as native.

- Top header: **48px** tall, white, shadow `0 1px 2px rgba(16,24,40,0.04)`.
  Left: wordmark — "One" in `#1C1917` + "Ohm" in `#76C044`, 18px semibold, no gap.
  Middle: 448×32 search field, `#F5F5F4`, 10px radius, magnifier + "Search".
  Right: bell icon, then a 28px round avatar `#EEF6E2` with `#4D7C0F` initials.
- Left icon rail: **48px** wide, white, 32px icon buttons, 8px radius. Active
  button has an `#EEF6E2` fill and `#4D7C0F` icon.
- Nav panel: **200px** wide, white. Grouped list with 10px uppercase group
  headings in `#57534E`. Rows 32px, 13px text `#57534E`, 8px radius. The active
  row is `#EEF6E2` / `#4D7C0F`.
  Groups and items: **Workspace** (My Work, My Tasks, Follow-ups) · **Sales**
  (Customers, Properties, Quotes, Pipeline) · **Delivery** (Projects, Inventory,
  Service, Finance).
- Content area: everything remaining. **20px** padding. Blocks stacked with a
  22px gap.

Total desktop artboard width **1440px**.

---

## Page structure — seven blocks, in this order

Visual weight must fall as you go down. Block 3 dominates. Block 7 is quiet.

### 1. Greeting
Left: "Good morning, Tejas" (20px semibold), then one plain sentence of state —
"Four things are overdue. Seven need you today." (13px, `#57534E`).
Right, baseline-aligned: the date in 12px `#A8A29E`.

### 2. Three numbers
Three equal cards in a row. Each: a 40px rounded-10px tinted icon tile, then a
10px uppercase label above a 24px number.

They are **Overdue** (critical tint) · **Due today** (warning tint) ·
**Due this week** (info tint).

> These three must be **disjoint sets**. An earlier draft used "Needs attention ·
> Overdue · Due soon" and two of the three carried no information: "Needs
> attention" merely restated the badge on the block immediately below it, and since
> every overdue item is critical, "Overdue" then covered nearly the same records
> again. Do not reintroduce that.

### 3. Needs attention — the loudest block
Section heading + a count badge in the critical tint.
One card holding **6 rows**, then a "View all 8" link in `#0D74B8`.

This block holds **only critical items**, pulled from every other section.

Rows to show:
1. Quote lapsed · Sharma Residence — "Q-1042 passed its valid-until date 3 days ago and is still marked sent." → **Open quote**
2. Quote accepted, no project · Verma Enterprises — "Accepted 6 days ago. The project has not been created yet." → **Convert to project**
3. Follow-up overdue · Nikhil Patil — "'Discuss loan option' was due 5 days ago." → **Complete**
4. Service request overdue · SR-1024 — "ABC Construction. Due 2 days ago, still in progress." → **Open request**
5. Project overdue · Kitchen Renovation — "Deadline was 12 August. 9 of 23 tasks still open." → **Open project**
6. Payment overdue · Deshmukh Villa — "Installation milestone is ₹1,24,000 short · 11 days overdue." → **Open payments**

### 4. Workflow stuck
Heading + warning-tint badge "9" + a faint aside "2 critical shown above".
One card, **5 rows**, then "View all 9".

Each row carries a small neutral stage chip (`#F5F5F4` / `#57534E`, 10px
uppercase) in a fixed 92px column before the text, so the stages line up.

1. `PROPERTY` — Property required · Kulkarni Traders — "Onboarded 9 days ago. No property has been added." → **Add property**
2. `SITE VISIT` — Site visit unassigned · Jadhav Rooftop — "Nobody is assigned to visit this property yet." → **Open property**
3. `SURVEY` — Survey pending · Bhosale Farmhouse — "Site visit completed 4 days ago. Survey has not started." → **Complete survey**
4. `QUOTE` — Quote required · Pawar Residence — "Survey done 2 days ago. No quote has been created." → **Create quote**
5. `QUOTE` — Quote in draft · Shinde Industries — "Q-1067 started 5 days ago and has not been sent." → **Continue quote** *(info edge, not warning)*

### 5. Follow-ups │ Service requests
Two equal columns, 20px gap. Each is its own heading + neutral badge + card.

Inside a card, rows are grouped under small 10px uppercase bucket headings
coloured by urgency.

> **A section never renders an "Overdue" bucket.** Every overdue item is critical,
> and every critical item has already moved to block 3. So an Overdue bucket here
> would always be empty. Sections start at their first non-critical bucket, and the
> lifted work is reported in the heading aside instead.

**Follow-ups** — badge 8, aside "2 overdue shown above".
- `TODAY · 3` (warning) — Rahul Gaikwad · Confirm roof access (11:30) · Meera Joshi · Collect electricity bill (15:00) · Sunita Kale · Send revised pricing (17:00)
- `NEXT 7 DAYS · 3` (info) — Anil Deshpande · Site walkthrough (Mon 24 Aug) · Prakash Mane · Share subsidy paperwork (Wed 26 Aug)
- Every row ends in a small **Complete** button — this action happens on the dashboard, it does not navigate away.
- Footer link "Open follow-ups".

**Service requests** — badge 9, aside "2 overdue shown above".
- `DUE TODAY · 2` (warning) — SR-1031 · Panel cleaning visit (Sawant Bungalow · medium) · SR-1033 · Net-meter reading (Kadam Enterprises · low)
- `NOBODY ASSIGNED · 3` (warning) — SR-1040 · App login not working (Nair Residence · no due date) · SR-1042 · Generation lower than quoted (Bhagat Residence · no due date)
- `DUE IN 7 DAYS · 2` (info) — SR-1044 · Annual maintenance visit (Chavan Residence · due 25 Aug · low)
- Rows end in a small **Open** button. Footer link "Open service".

### 6. Project health
Heading + neutral badge "6" + aside "overdue projects also appear above".
One card, **4 project rows**, footer "Open projects".

**This is a health summary, not a task list. Never list individual tasks.**

Each row is two lines inside the coloured edge:
- Line 1: project name (13px semibold, grows) · deadline (12px, coloured by
  urgency) · "14 / 23 tasks done" (12px `#57534E`). An **Open** button sits at
  the row's top right.
- Line 2: a row of milestone chips. Each chip is a small SVG status icon plus
  "Name 8/8", tinted by status — complete `#EAFBEF`/`#15803D`, in progress
  `#E8F4FB`/`#0369A1`, at risk `#FEF7E6`/`#A16207`, not started
  `#F5F5F4`/`#57534E`.

1. Kitchen Renovation — critical edge — "Deadline was 12 Aug" · 14/23 — Design 8/8 ✓ · Production 6/9 ◐ · Installation 0/6 ⚠ 2 overdue
2. Deshmukh Villa — 8kW rooftop — warning edge — "Due 26 Aug" · 19/24 — Design 6/6 ✓ · Production 9/9 ✓ · Commissioning 4/9 ⚠ 1 blocked
3. Rane Residence — 5kW rooftop — success edge — "Due 14 Sep" · 11/21 — Design 7/7 ✓ · Production 4/8 ◐ · Installation 0/6 (not started)
4. Kadam Enterprises — 40kW shed — success edge — "Due 30 Sep" · 5/31 — Design 5/9 ◐ · Production 0/12 · Installation 0/10

*(✓ ◐ ⚠ above describe the icon to draw. Draw SVGs, never these characters.)*

### 7. Money to chase — the quietest block
Heading + neutral badge "4" + aside "1 overdue shown above". One card, 3 rows,
footer "Open finance".

Each row: name · milestone, then a reason line, then a right-aligned bold amount,
then a small **Open** button.

1. Rane Residence · Production milestone — "Due in 2 days" — ₹2,10,000
2. Kadam Enterprises · Advance milestone — "Due in 3 days" — ₹4,80,000
3. Sawant Bungalow · Final milestone — "Due in 3 days" — ₹46,500

---

## Row anatomy — the single most important detail

Every actionable row follows one pattern:

```
▌  Title · Which record
   Why you are seeing this, and the date.              [ Action → ]
```

- `▌` is a **3px wide, fully rounded, full-height coloured bar** at the row's left
  edge. It is the **only** colour on the row.
- Line 1 (13px, 500–600 weight, `#1C1917`): what it is and which record.
- Line 2 (12px, `#57534E`): **why** this is on screen, plus the relevant date.
  Write it as a plain sentence a tired person can read in one go.
- Right: **one** button, 26–28px tall, pill, `#EEF6E2` / `#4D7C0F`, 12px medium,
  with a small arrow. Never two or three buttons on a row.
- Row padding roughly 11px 12px, gap 12px, 2px between rows. No dividers.

---

## The three states — put these on their own artboard

- **Loading** — grey skeleton bars matching real row heights, per block. No
  spinner. The layout must not shift when content arrives.
- **Empty** — one quiet muted sentence, e.g. "No follow-ups need attention." No
  icon, no illustration, nothing alarming. An empty section is good news.
- **Broken** — only the failed block changes: one line plus a **Retry** button
  inside it. Every other block draws normally.

---

## Mobile — 375px artboard

Not a squeezed desktop. Re-prioritise:

1. Overdue / Due today / Due this week — as a compact row or a single line
2. Needs attention
3. Follow-ups
4. Service requests
5. Project health
6. Workflow stuck
7. Money to chase

Every row keeps its action. Touch targets **44px minimum**. The action may drop
below the text rather than sit beside it.

---

## Deliverables

Four artboards:

- **A — Desktop, 1440 wide**, full page with the shell.
- **B — Mobile, 375 wide**, full page.
- **C — States**, showing loading, empty and broken side by side.
- **D — Components**, the row pattern at each of the four urgencies, the button,
  the badges, the stage chip and the milestone chips.

---

## Do not

- Do not add sections, metrics, charts or KPIs. Every block above exists because a
  real database field backs it. Anything new would be invented.
- Do not add a chart. This is a work list, not a report.
- Do not colour whole cards red. Colour lives on the 3px edge and in badges.
- Do not use emoji or unicode symbols as icons.
- Do not put borders on cards or dividers between rows.
- Do not change the type sizes to be larger and friendlier. The density is deliberate.
- Do not rename the blocks. The wording matches the engineering spec.
