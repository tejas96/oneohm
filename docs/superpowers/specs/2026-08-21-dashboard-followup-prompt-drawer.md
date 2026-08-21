# Follow-up prompt for Claude Design — the "View all" drawer

> Paste everything below the horizontal rule into the existing
> **Solar EPC workload app** project in Claude Design.
> Full brief: `2026-08-21-dashboard-brief-for-claude-design.md`.

---

Add one artboard to this project, and wire two links on the existing one.

## First — do not undo these four corrections

`My Work.dc.html` was edited after you last built it. Keep all four of these exactly as
they now are:

1. The blocked action button uses `var(--text-secondary)`, **not** `var(--text-tertiary)`.
   Tertiary on a sunken fill is about 2.3:1 and fails contrast, and this button is
   interactive — it opens the permission dialog.
2. Service rows in the "Nobody assigned" bucket say **Open request**, not "Assign".
   There is no assign-from-dashboard flow in this product.
3. The three **Money to chase** rows each carry an **Open payments** button. Every row on
   this page ends in exactly one action; those three had none.
4. Cards use `border-radius: var(--r-card-expressive)`, **not** a hard-coded `20px`.
   20px is not on the radius scale.

Change nothing else on `My Work.dc.html` except the two links named below.

## The problem being solved

Six links on the dashboard say "view all". Four resolve to a real screen —
**Open follow-ups**, **Open service**, **Open projects**, **Open finance**.

The other two do not: **View all 8** on *Needs attention*, and **View all 9** on
*Workflow stuck*. Both lists deliberately mix a quote, a property, a follow-up, a
service ticket, a project and a payment. No screen in this product shows that mix, and
the dashboard is not allowed to create sub-pages.

The resolution: the list is mixed, but **no single row is**. Every row already carries
its own entity, its own action and its own destination. So the mixed list needs
somewhere to live — not a shared destination.

## What to add — artboard "My Work - Drawer"

A drawer sliding in from the right, over the dashboard. The dashboard stays visible and
in place behind it, dimmed the way the existing dialogs dim it — **blur and fade toward
white, never darken.** That is this design system's overlay rule.

The drawer holds:

- **Title** — the section's name and its full count: `Needs attention · 8`.
  Same tiny uppercase treatment as the section labels on the dashboard.
- **A search field**, directly under the title. This exists for the day someone has
  forty stuck items, not nine. Use the design system's input.
- **Every row in that section**, drawn with the **same row pattern as the dashboard** —
  leading avatar or record icon, name over sub-line, reason in its own column, right
  meta in tabular numerals, one action button. Do not restyle the rows for the drawer.
- **A quiet close** — an icon button, top right, and clicking the dimmed page behind it.

Nothing else. No filters, no sort control, no tabs, no bulk actions, no footer.

Show it holding the *Needs attention* set, so the mix is visible: a quote, a property,
a follow-up, a service ticket, a project and a payment, one under the other, each with
its own different action.

## And on `My Work.dc.html`

Make the two **View all** links open this drawer, the same way the **Complete** button
already opens the follow-up dialog. Leave the other four links pointing where they do.

## Do not

- Do not turn the drawer into a page. It is a sheet over the dashboard.
- Do not give the rows a shared action, a shared destination, or a type filter.
- Do not add a coloured bar, a tint or a status pill to the drawer rows.
- Do not change the type scale, the spacing or the colours from the dashboard.
