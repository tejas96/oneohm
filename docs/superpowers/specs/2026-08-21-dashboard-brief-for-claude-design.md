# Prompt for Claude Design — OneOhm "My Work" dashboard

> Copy everything below the horizontal rule into Claude Design.
> Colour, type and theme are **not** specified here — the OneOhm design system is
> already set up in that project, and it decides those.
> Engineering source of truth: `2026-08-21-dashboard-my-work-design.md`.

---

## What you are designing

A single-page operational dashboard for **OneOhm**, an internal web app used by a
solar EPC company in India. The people using it are employees — sales reps, site
engineers, project coordinators. Not customers. Not executives.

The page answers one question: **what needs me right now, and where do I click?**

It is a working screen someone opens every morning and returns to between jobs. It
is not a report and not an analytics view. Every row carries an action.

## Use the OneOhm design system

Take colour, type, spacing, radii, elevation, icons and components from the design
system already in this project. Do not introduce a new palette, a new typeface, or
a different density.

Two things from that system are load-bearing here, so please honour them even if
they feel unusual:

- **Cards carry no borders and rows carry no dividers.** The system's rule is that
  hierarchy comes from luminance and softness, never from lines. Separation comes
  from spacing, weight, elevation and the coloured row edge described below.
- **Buttons and chips are fully rounded.** That is fixed in the system.

One known defect to avoid: the brand green is too light to carry white text — that
pair fails accessibility. Use the system's subtle-green fill with its darker green
text for buttons instead.

### Urgency is expressed with four roles, not five

Use the system's semantic roles by name:

| Role | Meaning on this page |
|---|---|
| **critical** | Overdue, lapsed, blocked |
| **warning** | Due soon, unassigned, needs attention |
| **info** | Active, upcoming, in progress |
| **success** | Complete, healthy |

There is no separate "orange" and "yellow" tier. Due-soon and needs-attention share
the warning role. Do not add a fifth.

### Icons

Draw them as inline SVG in the system's icon style. **No emoji, no unicode
dingbats** — never ✓, ◐, ⚠, ★ as an icon.

---

## The app shell

The dashboard renders inside fixed chrome. Draw it so the page reads as native. If
the design system has app-shell components, use those; these are the real
dimensions:

- **Top header, 48px tall.** Left: the OneOhm wordmark. Middle: a 448×32 search
  field. Right: a notification bell, then a 28px round avatar with initials.
- **Left icon rail, 48px wide.** 32px icon buttons. The active one is filled.
- **Nav panel, 200px wide.** Grouped list, 32px rows, the active row filled.
  Groups: **Workspace** (My Work, My Tasks, Follow-ups) · **Sales** (Customers,
  Properties, Quotes, Pipeline) · **Delivery** (Projects, Inventory, Service,
  Finance).
- **Content area:** the rest. Blocks stacked with a consistent gap.

Desktop artboard width **1440px**.

The page has **no tabs, no filter bar, no date-range picker and no employee
picker**. It is one scroll.

---

## Page structure — seven blocks, in this order

Visual weight must fall as you go down. Block 3 dominates the screen. Block 7 is
quiet.

### 1. Greeting
Left: "Good morning, Tejas", then one plain sentence of state — "Four things are
overdue. Seven need you today."
Right, baseline-aligned: the date, in the faintest text role.

### 2. Three numbers
Three equal cards. Each: a rounded tinted icon tile, then a small uppercase label
above a large number.

**Overdue** (critical) · **Due today** (warning) · **Due this week** (info).

> These three must be **disjoint sets**. An earlier draft used "Needs attention ·
> Overdue · Due soon" and two of the three carried no information: "Needs
> attention" merely restated the badge on the block immediately below it, and
> because every overdue item is critical, "Overdue" then covered nearly the same
> records again. Do not reintroduce that.

### 3. Needs attention — the loudest block
Heading + a count badge in the critical role. One card, **6 rows**, then a
"View all 8" link.

This block holds **only critical items**, pulled in from every other section.

1. Quote lapsed · Sharma Residence — "Q-1042 passed its valid-until date 3 days ago and is still marked sent." → **Open quote**
2. Quote accepted, no project · Verma Enterprises — "Accepted 6 days ago. The project has not been created yet." → **Convert to project**
3. Follow-up overdue · Nikhil Patil — "'Discuss loan option' was due 5 days ago." → **Complete**
4. Service request overdue · SR-1024 — "ABC Construction. Due 2 days ago, still in progress." → **Open request**
5. Project overdue · Kitchen Renovation — "Deadline was 12 August. 9 of 23 tasks still open." → **Open project**
6. Payment overdue · Deshmukh Villa — "Installation milestone is ₹1,24,000 short · 11 days overdue." → **Open payments**

### 4. Workflow stuck
Heading + warning badge "9" + a faint aside "2 critical shown above". One card,
**5 rows**, then "View all 9".

Each row carries a small neutral stage chip in a **fixed-width column before the
text**, so the stages line up down the block.

1. `PROPERTY` — Property required · Kulkarni Traders — "Onboarded 9 days ago. No property has been added." → **Add property**
2. `SITE VISIT` — Site visit unassigned · Jadhav Rooftop — "Nobody is assigned to visit this property yet." → **Open property**
3. `SURVEY` — Survey pending · Bhosale Farmhouse — "Site visit completed 4 days ago. Survey has not started." → **Complete survey**
4. `QUOTE` — Quote required · Pawar Residence — "Survey done 2 days ago. No quote has been created." → **Create quote**
5. `QUOTE` — Quote in draft · Shinde Industries — "Q-1067 started 5 days ago and has not been sent." → **Continue quote** *(info role, not warning)*

**The full set this block draws from — design so all nine fit the pattern:**
property required · site visit unassigned · site visit pending · survey pending ·
quote required · quote in draft · quote expiring · quote lapsed · quote accepted
but no project.

### 5. Follow-ups │ Service requests
Two equal columns. Each is its own heading + badge + card.

Rows inside a card are grouped under small uppercase bucket headings coloured by
urgency role.

> **A section never renders an "Overdue" bucket.** Every overdue item is critical,
> and every critical item has already moved to block 3. An Overdue bucket here
> would be empty by construction. Sections start at their first non-critical
> bucket; the lifted work is reported in the heading aside instead.

**Follow-ups** — badge 8, aside "2 overdue shown above".
- `TODAY · 3` (warning) — Rahul Gaikwad · Confirm roof access (11:30) · Meera Joshi · Collect electricity bill (15:00) · Sunita Kale · Send revised pricing (17:00)
- `NEXT 7 DAYS · 3` (info) — Anil Deshpande · Site walkthrough (Mon 24 Aug) · Prakash Mane · Share subsidy paperwork (Wed 26 Aug)
- Every row ends in a small **Complete** button. This one acts on the page — see
  the dialog below.
- Footer link "Open follow-ups".

**Service requests** — badge 9, aside "2 overdue shown above".
- `DUE TODAY · 2` (warning) — SR-1031 · Panel cleaning visit (Sawant Bungalow · medium) · SR-1033 · Net-meter reading (Kadam Enterprises · low)
- `NOBODY ASSIGNED · 3` (warning) — SR-1040 · App login not working (Nair Residence · no due date) · SR-1042 · Generation lower than quoted (Bhagat Residence · no due date)
- `DUE IN 7 DAYS · 2` (info) — SR-1044 · Annual maintenance visit (Chavan Residence · due 25 Aug · low)
- Rows end in a small **Open** button. Footer link "Open service".

### 6. Project health
Heading + neutral badge "6" + aside "overdue projects also appear above". One
card, **4 project rows**, footer "Open projects".

**This is a health summary, not a task list. Never list individual tasks.**

Each row is two lines inside the coloured edge:
- Line 1: project name · deadline (coloured by urgency) · "14 / 23 tasks done".
  An **Open** button sits at the row's top right.
- Line 2: a row of milestone chips. Each chip is a small status icon plus
  "Name 8/8", tinted by role — complete, in progress, at risk, or not started
  (neutral).

1. Kitchen Renovation — critical edge — "Deadline was 12 Aug" · 14/23 — Design 8/8 complete · Production 6/9 in progress · Installation 0/6 at risk, 2 overdue
2. Deshmukh Villa — 8kW rooftop — warning edge — "Due 26 Aug" · 19/24 — Design 6/6 complete · Production 9/9 complete · Commissioning 4/9 at risk, 1 blocked
3. Rane Residence — 5kW rooftop — success edge — "Due 14 Sep" · 11/21 — Design 7/7 complete · Production 4/8 in progress · Installation 0/6 not started
4. Kadam Enterprises — 40kW shed — success edge — "Due 30 Sep" · 5/31 — Design 5/9 in progress · Production 0/12 not started · Installation 0/10 not started

### 7. Money to chase — the quietest block
Heading + neutral badge "4" + aside "1 overdue shown above". One card, 3 rows,
footer "Open finance".

Each row: name · milestone, a reason line, a right-aligned bold amount, then a
small **Open** button.

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

- `▌` is a **narrow, fully rounded, full-height coloured bar** at the row's left
  edge, in the urgency role. It is the **only** colour on the row.
- Line 1: what it is, and which record. Slightly heavier than body.
- Line 2: **why** this is on screen, plus the relevant date. Write it as a plain
  sentence a tired person reads in one go — never a status code or a raw field.
- Right: **one** button, small, pill, with a small arrow. Never two or three
  buttons on a row.
- Rows sit close together with a small gap. No dividers.

### Row hover

Rows are clickable. Give them a restrained hover — a faint fill and the button
gaining emphasis. Nothing that moves the layout.

### A blocked action

Not every employee may do every action. When they may not, the app **still shows
the button** — greyed and marked — and clicking it opens a small dialog naming the
permission they need. Someone who cannot see a feature cannot know to ask for it.

Design that blocked button state, and that dialog.

---

## The follow-up completion dialog

The **Complete** button on a follow-up row does not navigate away. It opens a
dialog on top of the dashboard, because completing a follow-up is not one click —
the system requires:

- an **outcome**, chosen from a fixed list: not reachable · call back later ·
  interested · site visit done · documents pending · negotiating · not interested ·
  other *(choosing "other" requires a note)*
- optional **notes**
- and usually the **next follow-up** — a date and time, a subject, and who it is
  assigned to

Design this dialog. It is the one thing on this page that writes data.

---

## The three states — their own artboard

- **Loading** — skeleton bars matching real row heights, per block. No spinner.
  The layout must not shift when the content arrives.
- **Empty** — one quiet muted sentence, e.g. "No follow-ups need attention." No
  icon, no illustration, nothing alarming. An empty section is good news.
- **Broken** — only the failed block changes: one line plus a **Retry** button
  inside it. Every other block draws normally. The page never fails as a whole.

---

## Mobile — 375px artboard

Not a squeezed desktop. Re-prioritise:

1. The three numbers, compacted
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

Five artboards:

- **A — Desktop, 1440 wide**, the full page inside the shell.
- **B — Mobile, 375 wide**, the full page.
- **C — States**, loading, empty and broken side by side.
- **D — Components**, the row pattern at all four urgency roles, plus the button,
  the blocked button, the badges, the stage chip and the milestone chips.
- **E — Follow-up completion dialog.**

---

## Do not

- **Do not add sections, metrics, KPIs or charts.** Every block above exists
  because a real database field backs it. Anything new would be fiction.
- Do not add tabs, filters, a date-range picker or an employee picker. Those are a
  later release.
- Do not list individual tasks anywhere. Counts and milestone health only.
- Do not colour whole cards by urgency. Colour lives on the edge bar and in badges.
- Do not use emoji or unicode symbols as icons.
- Do not put borders on cards or dividers between rows.
- Do not make the type larger and friendlier. The density is deliberate — these
  people scan this page many times a day.
- Do not rename the blocks. The wording matches the engineering spec.
