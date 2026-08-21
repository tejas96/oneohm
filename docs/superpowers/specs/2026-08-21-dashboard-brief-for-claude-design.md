# Prompt for Claude Design — OneOhm "My Work" dashboard

> Copy everything below the horizontal rule into Claude Design, **and attach the
> reference screenshot**. The reference sets the visual language; this prompt sets
> the content, the rules and the behaviour.
> Engineering source of truth: `2026-08-21-dashboard-my-work-design.md`.

---

## The one-line brief

Design the daily home screen for **OneOhm**, an internal web app used by a solar EPC
company in India. It answers one question for the employee who opens it:
**what needs me right now, and where do I click?**

Aim for the calm, editorial, unmistakably-crafted end of the spectrum. This screen
gets opened twenty times a day by someone who is busy. It should feel like a
well-set page, not a control panel.

---

## Start from the attached reference

The attached screenshot is the target for **layout, rhythm, density and restraint**.
Follow it closely. Specifically, these are the qualities to carry over:

- **Two content columns.** A wide main column of work, and a narrower right column
  of supporting cards. Roughly a 7:3 split.
- **Airy white cards on a near-white canvas.** Large radius, very soft shadow,
  **no borders anywhere** and **no dividers between rows**. Separation comes from
  white space alone.
- **No coloured bars, tags or tinted row backgrounds.** In the reference, urgency
  is carried entirely by a small amount of **red text** and a **tiny uppercase
  section label**. That restraint is the whole reason it looks good. Do not add
  status pills to every row, do not tint rows, do not put a coloured edge on rows.
- **Tiny uppercase section labels** with wide letter-spacing and a count after a
  middle dot: `OVERDUE · 2`. The label takes the urgency colour; everything under
  it stays neutral.
- **Generous row height** with real vertical breathing room. Roughly 52–56px rows.
- **A strong column grid inside each row.** Every row in a card aligns on the same
  vertical rails, so the eye reads straight down each column.
- **Initials avatars** in soft tinted circles for anything about a person.
- **Tabular / monospaced numerals** for money, capacities and times, right-aligned
  so digits stack. This is a large part of why the reference reads as considered.
- **Quiet circular ghost icon buttons** at the end of a row for the action.
- **A greeting card** with an oversized greeting, a one-line state summary
  underneath, and a soft decorative gradient wash in the far corner.

What **not** to carry over from the reference: it is a lead-management screen for a
different product. Ignore its "voice agent" card, its "Add lead" button, and its
specific content. Only the visual language transfers.

---

## Use the OneOhm brand

Take type, spacing and components from the OneOhm design system already set up in
this project. The brand palette, for reference:

| Role | Value |
|---|---|
| Canvas | `#FAFAF9` |
| Card | `#FFFFFF` |
| Text primary / secondary / faint | `#1C1917` / `#57534E` / `#A8A29E` |
| Brand green | `#76C044` — the wordmark and the accent, used sparingly |
| Action text / subtle fill | `#4D7C0F` / `#EEF6E2` |
| Critical | `#DC2626` |
| Warning | `#A16207` |
| Info | `#0369A1` |
| Success | `#15803D` |

Rules on colour:

- **Four urgency roles, not five** — critical, warning, info, success. There is no
  separate orange and yellow tier; due-soon and needs-attention share warning.
- **Colour appears as text, not as fill.** A section label, a reason line, a number.
  Never a coloured row background, never a full-width red banner.
- **Never white text on `#76C044`.** That pair is 2.24:1 and fails accessibility.
  Use `#EEF6E2` fill with `#4D7C0F` text.
- The page should read as near-monochrome with a few deliberate points of colour.

Icons: inline SVG, stroke-based, one consistent style. **No emoji, no unicode
dingbats** — never ✓ ◐ ⚠ ★ as an icon.

---

## Scope: the content area only

The app already has its navigation — a 48px icon rail and a 200px sub-menu panel,
plus a 48px top header. **Do not design, redraw or replace any of them.** Do not add
a sidebar of your own, a tab bar, a filter bar, a date-range picker, or an employee
picker.

Design **only the dashboard content area**, as one uninterrupted scroll. Draw it
1192px wide, which is what is left on a 1440px screen.

---

## The content — this is the part that must be exactly right

**Eight blocks appear on this page, and no others.** Every one is backed by a real
database field. **Do not invent an extra metric, chart, KPI or section** — there would be no
data behind it.

### Main column

#### 1. Greeting card

Oversized "Good morning, Tejas", with today's date as quiet static text beside or
beneath it — **Friday, 21 August**. Not a chip, not a control; it is what anchors
every relative date further down the page.

Under that, one plain sentence of state where only the urgent fragment takes colour:

> **7 overdue** · 5 due today · 9 more this week

Soft decorative gradient wash in the far corner, in brand green, very low opacity.

#### 2. `NEEDS ATTENTION · 8` — the loudest block on the page

Critical-coloured label. **6 rows**, then a quiet "View all 8" link.

This block holds **only critical items**, gathered from every other section.

| Record | Why it is here | Action |
|---|---|---|
| Sharma Residence · Q-1042 | Quote lapsed 3 days ago, still marked sent | Open quote |
| Verma Enterprises | Quote accepted 6 days ago, project never created | Convert to project |
| Nikhil Patil | Follow-up "Discuss loan option" 5 days late | Complete |
| SR-1024 · ABC Construction | Service request 2 days overdue, still in progress | Open request |
| Kitchen Renovation | Project deadline was 12 Aug, 9 of 23 tasks open | Open project |
| Deshmukh Villa | Installation milestone ₹1,24,000 short, 11 days overdue | Open payments |

Note the mix: people, quotes, tickets, projects and money all sit in one list. The
row pattern has to hold all of them gracefully.

#### 3. `WORKFLOW STUCK · 9` — warning label, aside "2 critical shown above"

**5 rows**, then "View all 9". This is the sales pipeline snagging.

Each row carries a small neutral stage chip in a **fixed-width column before the
name**, so the stages line up down the block.

| Stage | Record | Why it is here | Action |
|---|---|---|---|
| PROPERTY | Kulkarni Traders | Onboarded 9 days ago, no property added | Add property |
| SITE VISIT | Jadhav Rooftop | Nobody assigned to visit yet | Open property |
| SURVEY | Bhosale Farmhouse | Site visit done 4 days ago, survey not started | Complete survey |
| QUOTE | Pawar Residence | Survey done 2 days ago, no quote created | Create quote |
| QUOTE | Shinde Industries | Q-1067 drafted 5 days ago, never sent | Continue quote |

The last row is `info`, not warning. **Design so all nine kinds fit this pattern:**
property required · site visit unassigned · site visit pending · survey pending ·
quote required · quote in draft · quote expiring · quote lapsed · quote accepted
but no project.

#### 4. `FOLLOW-UPS · 8` — aside "2 overdue shown above"

Rows grouped under small uppercase bucket sub-labels. Initials avatars. Time on the
left in tabular numerals, in the info colour, exactly as the reference does it.

- `TODAY · 3` — 11:00 Rahul Gaikwad, Confirm roof access · 15:00 Meera Joshi,
  Collect electricity bill · 17:00 Sunita Kale, Send revised pricing
- `NEXT 7 DAYS · 3` — Mon 24 Aug Anil Deshpande, Site walkthrough ·
  Wed 26 Aug Prakash Mane, Share subsidy paperwork

The bucket counts are the true totals. Draw **5 rows** in all, then a quiet
"Open follow-ups →" link for the remainder — the same treatment as the links on
the blocks above.

Every row ends in a **Complete** action. This one does not navigate — it opens a
dialog, specified below.

> **There is deliberately no OVERDUE bucket here.** Every overdue follow-up is
> critical, and every critical item has already moved to block 2. An overdue bucket
> would be empty by construction. The heading aside reports the lifted work instead.
> Same for service requests and money below.

#### 5. `SERVICE REQUESTS · 9` — aside "2 overdue shown above"

- `DUE TODAY · 2` — SR-1031 Panel cleaning visit, Sawant Bungalow, medium ·
  SR-1033 Net-meter reading, Kadam Enterprises, low
- `NOBODY ASSIGNED · 3` — SR-1040 App login not working, Nair Residence ·
  SR-1042 Generation lower than quoted, Bhagat Residence
- `DUE IN 7 DAYS · 2` — SR-1044 Annual maintenance visit, Chavan Residence, 25 Aug

Same here: the bucket counts are the true totals. **5 rows** in all, then a quiet
"Open service →" link.

Priority (low / medium / high / urgent) is real data and may be shown, but quietly —
this is not a place for four coloured pills per row.

#### 6. `PROJECT HEALTH · 6` — aside "overdue projects also appear above"

**4 rows**, then "Open projects". This is a health summary. **Never list individual
tasks anywhere on this page.**

Each row: project name, its deadline coloured by urgency, "14 / 23 tasks done" in
tabular numerals, and an Open action. Under that, a row of **milestone chips** —
each a small status icon plus "Design 8/8", carrying complete / in progress / at
risk / not started.

1. Kitchen Renovation — deadline was 12 Aug — 14/23 — Design 8/8 complete ·
   Production 6/9 in progress · Installation 0/6 at risk, 2 overdue
2. Deshmukh Villa, 8kW rooftop — due 26 Aug — 19/24 — Design 6/6 complete ·
   Production 9/9 complete · Commissioning 4/9 at risk, 1 blocked
3. Rane Residence, 5kW rooftop — due 14 Sep — 11/21 — Design 7/7 complete ·
   Production 4/8 in progress · Installation 0/6 not started
4. Kadam Enterprises, 40kW shed — due 30 Sep — 5/31 — Design 5/9 in progress ·
   Production 0/12 not started · Installation 0/10 not started

An employee must be able to see which milestone is in trouble without opening
anything.

### Right column

#### 7. `AT A GLANCE`

Three rows, each a small tinted round icon, a label, and a right-aligned tabular
count — the reference's "Upcoming this week" card is exactly the pattern.

- **Overdue** — 7
- **Due today** — 5
- **Due this week** — 9

> These three must stay **disjoint sets**. An earlier draft used "Needs attention ·
> Overdue · Due soon" and two of the three carried no information: "Needs attention"
> restated the badge on the block below it, and since every overdue item is
> critical, "Overdue" then covered nearly the same records. Do not reintroduce that.

#### 8. `MONEY TO CHASE · 4` — aside "1 overdue shown above"

Three rows, amounts right-aligned in tabular numerals, then "Open finance".

- Rane Residence · Production milestone — due in 2 days — ₹2,10,000
- Kadam Enterprises · Advance milestone — due in 3 days — ₹4,80,000
- Sawant Bungalow · Final milestone — due in 3 days — ₹46,500

Small block, quiet treatment. It answers "is there money work?", nothing more.

---

## The row — the single most important detail on the page

Every row answers six questions at a glance:

1. What is it? 2. Why am I seeing it? 3. How urgent? 4. What date?
5. What can I do? 6. Where does that take me?

Structure, on one shared column grid:

```
(AV)   Name of the record            Why it is here            meta   ( ⌾ )
       Where / who                                          ₹ amount
```

- **Leading element:** an initials avatar for anything about a person; a small
  tinted rounded-square icon for a record like a quote, ticket, project or payment.
- **Primary line:** what it is and which record. Slightly heavier than body.
- **Secondary line:** the place, the person, or the reference number. Faint.
- **Reason:** a plain sentence explaining why this is on screen, in its own column.
  Takes the urgency colour when urgent, neutral otherwise. Write it the way a
  colleague would say it — never a status code, never a raw field name.
- **Right meta:** dates, counts, money, in tabular numerals, right-aligned.
- **Action:** exactly **one**, at the end. Never two or three on a row.

Because the actions here are varied ("Add property", "Convert to project"), a
label is clearer than a bare icon — but keep it as quiet as the reference's circular
buttons: ghost by default, gaining a soft fill on row hover.

### Row hover
The whole row is clickable. A faint fill, and the action gains emphasis. Nothing
that shifts the layout.

### A blocked action
Not every employee may perform every action. When they may not, the app **still
shows the button** — muted and marked — and clicking it opens a small dialog naming
the permission needed. Someone who cannot see a feature cannot know to ask for it.
Design that muted state and that dialog.

---

## The "View all" drawer

Four of the overflow links go to an existing screen: **Open follow-ups**, **Open
service**, **Open projects**, **Open finance**.

The other two — **View all** on Needs Attention and on Workflow Stuck — have nowhere to
go, because both lists deliberately mix a quote, a property, a follow-up, a ticket, a
project and a payment, and no screen in the app shows that mix.

They open a **drawer** instead: a sheet sliding in over the dashboard, holding every row
in that section. The dashboard stays put behind it.

Design it with:

- The section's name and its full count as the title.
- A **search field** — this is the day someone has forty stuck items, not nine.
- The **same row pattern** as the dashboard, unchanged. Each row keeps its own action
  and its own destination; the mix needs no shared one.
- A quiet close. Nothing else — no filters, no sort control, no tabs.

## The follow-up completion dialog

The only thing on this page that writes data. Completing a follow-up is not one
click; the system requires:

- an **outcome**, from a fixed list: not reachable · call back later · interested ·
  site visit done · documents pending · negotiating · not interested · other
  *(choosing "other" requires a note)*
- optional **notes**
- and usually the **next follow-up** — date and time, subject, and who it goes to

It opens over the dashboard. Design it to feel like the lightest possible way to
close a loop, not a form.

---

## The three states

- **Loading** — skeleton rows matching real heights, per card. No spinner. The
  layout must not shift when content arrives.
- **Empty** — one quiet muted sentence, e.g. "No follow-ups need attention." No
  icon, no illustration, nothing alarming. An empty section is good news.
- **Broken** — only the failed card changes: one line and a **Retry**, inside it.
  Every other card draws normally. The page never fails as a whole.

---

## Mobile — 375px

Not a squeezed desktop. The two columns become one, re-ordered by urgency:

1. Greeting 2. At a glance 3. Needs attention 4. Follow-ups
5. Service requests 6. Project health 7. Workflow stuck 8. Money to chase

Every row keeps its action. Touch targets **44px minimum**. The action may drop
below the text rather than sit beside it.

---

## Deliverables

- **A — Desktop**, 1192px content area, the full page, both columns.
- **B — Mobile**, 375px, the full page.
- **C — States**, loading, empty and broken side by side.
- **D — Components**, the row at all four urgency roles, the action button and its
  blocked state, the section label, the stage chip, the milestone chips, the
  initials avatar, and the At-a-glance row.
- **E — Follow-up completion dialog.**
- **F — Permission-blocked dialog.**
- **G — The "View all" drawer**, over a dimmed dashboard.

---

## Do not

- Do not add sections, metrics, KPIs, charts, graphs or progress rings. Every block
  above exists because a real database field backs it. Anything else is fiction.
- Do not design navigation. The rail and sub-menu already exist.
- Do not add tabs, filters, a date picker or an employee picker.
- Do not list individual tasks. Counts and milestone health only.
- Do not put a coloured bar, tint or badge on every row. Restraint is the design.
- Do not put borders on cards or dividers between rows.
- Do not use emoji or unicode symbols as icons.
- Do not make the type large and friendly. This is a dense professional tool read
  many times a day.
- Do not rename the blocks. The wording matches the engineering spec.
