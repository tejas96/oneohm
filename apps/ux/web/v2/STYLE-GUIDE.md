# OneOhm V2 UX Style Guide

> **Version 2.1 - Refined**  
> This guide defines the visual standards for all V2 UX pages. Follow these patterns for consistency.

---

## Quick Reference

| Property        | Value                               | Notes                            |
| --------------- | ----------------------------------- | -------------------------------- |
| Base font       | `13px` (`text-[13px]` or `text-sm`) | Data-dense, compact              |
| Font family     | Inter                               | Via Google Fonts                 |
| Primary color   | `#76c044`                           | Use `text-primary`, `bg-primary` |
| Border radius   | `rounded-lg` (8px)                  | Cards, modals                    |
| Border color    | `border-gray-100`                   | Subtle, light                    |
| Shadow          | `shadow-sm` or none                 | Minimal shadows                  |
| Page background | `bg-gray-50` or `#fafafa`           | Light neutral                    |

---

## Typography

### Font Sizes (Use These)

```html
<!-- Micro text (badges, timestamps) -->
<span class="text-[11px]">Badge text</span>

<!-- Body text (DEFAULT) -->
<p class="text-[13px]">Main content</p>
<!-- OR use text-sm which is 0.875rem = 14px, close enough -->

<!-- Labels -->
<label class="text-xs font-medium">Field Label</label>

<!-- Section headers -->
<h3 class="text-sm font-semibold">Section Title</h3>

<!-- Page titles -->
<h1 class="text-xl font-semibold">Page Title</h1>

<!-- Large headers (rare) -->
<h1 class="text-2xl font-semibold">Dashboard</h1>
```

### Font Weights

| Weight | Class           | Use For                               |
| ------ | --------------- | ------------------------------------- |
| 400    | `font-normal`   | Body text, descriptions               |
| 500    | `font-medium`   | Labels, table cells, emphasis         |
| 600    | `font-semibold` | Page titles, section headers, buttons |
| 700    | `font-bold`     | **AVOID** - too heavy                 |

### ❌ DON'T Use

```html
<!-- Too heavy -->
<h1 class="text-2xl font-bold">...</h1>
<span class="font-bold">...</span>

<!-- Too large -->
<h1 class="text-3xl">...</h1>
<h1 class="text-4xl">...</h1>
```

---

## Spacing

### Page Container

```html
<!-- Standard page padding -->
<main class="p-5">
  <!-- Content -->
</main>

<!-- NOT p-6 or p-8 -->
```

### Gaps & Margins

```html
<!-- Card grids -->
<div class="grid gap-3">...</div>
<!-- NOT gap-4, gap-6 -->

<!-- Page header to content -->
<div class="mb-5">Page Header</div>
<!-- NOT mb-6, mb-8 -->

<!-- Section spacing -->
<section class="mb-6">...</section>
<!-- NOT mb-8, mb-12 -->
```

### Component Spacing

```html
<!-- Card padding -->
<div class="p-4">...</div>
<!-- NOT p-5, p-6 -->

<!-- Button padding -->
<button class="px-3 py-1.5">...</button>
<!-- Compact -->
<button class="px-3.5 py-2">...</button>
<!-- Standard -->

<!-- Input padding -->
<input class="px-3 py-2" />
<!-- NOT px-4 py-2.5 -->
```

---

## Layout Dimensions

### Header

```css
.global-header {
  height: 48px; /* NOT 56px */
  border-bottom: 1px solid #f4f4f5; /* Subtle border */
  padding: 0 12px;
}
```

### Rail (Icon Strip)

```css
.rail {
  width: 48px; /* NOT 56px */
  top: 48px;
  height: calc(100vh - 48px);
}

.rail-icon {
  width: 48px;
  height: 36px; /* NOT 44px */
}
```

### Panel (Sidebar)

```css
.panel {
  width: 200px; /* NOT 240px */
  top: 48px;
  left: 48px;
  border-right: 1px solid #f4f4f5;
}

.panel-header {
  height: 40px; /* NOT 48px */
}

.panel-item {
  height: 30px; /* NOT 36px */
  font-size: 13px; /* NOT 14px */
}

.section-header {
  font-size: 10px; /* NOT 11px */
  font-weight: 500;
}
```

### Page Container

```css
.page-container {
  margin-left: 248px; /* 48px rail + 200px panel */
  margin-top: 48px;
  background: #fafafa;
}
```

---

## Tables

### Header

```html
<thead class="bg-gray-50/80 border-b border-gray-100">
  <tr>
    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
      Column Name
    </th>
  </tr>
</thead>
```

### Rows

```html
<tr class="hover:bg-gray-50/50 transition-colors">
  <td class="px-3 py-2">
    <!-- Avatar with name -->
    <div class="flex items-center gap-2.5">
      <div
        class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs"
      >
        RS
      </div>
      <div>
        <div class="font-medium text-gray-900">Name</div>
        <div class="text-gray-400 text-[11px]">+91 98765 43210</div>
      </div>
    </div>
  </td>
  <td class="px-3 py-2 text-gray-600">Content</td>
  <td class="px-3 py-2 text-gray-400">Jan 15, 2026</td>
</tr>
```

### Target Row Height: 44px (Comfortable Density)

---

## Badges & Tags

### Status Badges

```html
<!-- Active/Success -->
<span class="px-1.5 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 rounded">Active</span>

<!-- Pending/Warning -->
<span class="px-1.5 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 rounded"
  >Pending</span
>

<!-- Error/Danger -->
<span class="px-1.5 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 rounded">Overdue</span>

<!-- Info/Default -->
<span class="px-1.5 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded">New</span>

<!-- Neutral -->
<span class="px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-600 rounded">Draft</span>
```

### ❌ DON'T Use

```html
<!-- Too large -->
<span class="px-2.5 py-1 text-xs font-semibold rounded-full">...</span>

<!-- Too bold -->
<span class="font-semibold">...</span>
<span class="font-bold">...</span>
```

---

## Buttons

### Primary

```html
<button
  class="px-3 py-1.5 bg-primary text-white rounded-md text-[13px] font-medium hover:bg-primary-dark transition-colors"
>
  Action
</button>
```

### Secondary

```html
<button
  class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] font-medium hover:bg-gray-50 transition-colors"
>
  Cancel
</button>
```

### Sizes

```html
<!-- Small -->
<button class="px-2.5 py-1 text-xs">Small</button>

<!-- Default -->
<button class="px-3 py-1.5 text-[13px]">Default</button>

<!-- Large (rare) -->
<button class="px-4 py-2 text-sm">Large</button>
```

---

## Cards

```html
<div class="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm transition-shadow">
  <div class="flex items-start justify-between mb-3">
    <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
      <svg class="w-4 h-4 text-primary">...</svg>
    </div>
    <span class="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
      +12%
    </span>
  </div>
  <p class="text-2xl font-semibold text-gray-800">156</p>
  <p class="text-xs text-gray-500 mt-0.5">New Leads</p>
</div>
```

### ❌ DON'T Use

```html
<!-- Too rounded -->
<div class="rounded-2xl">...</div>
<div class="rounded-xl">...</div>

<!-- Too much padding -->
<div class="p-5">...</div>
<div class="p-6">...</div>

<!-- Heavy shadows -->
<div class="shadow-md">...</div>
<div class="shadow-lg">...</div>
```

---

## Form Inputs

```html
<!-- Text Input -->
<input
  type="text"
  class="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
  placeholder="Enter value..."
/>

<!-- Select -->
<select
  class="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
>
  <option>Option 1</option>
</select>

<!-- Label -->
<label class="block text-xs font-medium text-gray-700 mb-1"> Field Label </label>
```

---

## Modals

```html
<div id="modal" class="fixed inset-0 z-50 hidden" aria-modal="true" role="dialog">
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onclick="closeModal()"></div>

  <!-- Content -->
  <div class="fixed inset-0 overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-md bg-white rounded-lg shadow-xl">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100">
          <h3 class="text-base font-semibold text-gray-900">Modal Title</h3>
        </div>

        <!-- Body -->
        <div class="p-4">Content here...</div>

        <!-- Footer -->
        <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 rounded-b-lg">
          <button class="px-3 py-1.5 border border-gray-200 rounded-md text-[13px]">Cancel</button>
          <button class="px-3 py-1.5 bg-primary text-white rounded-md text-[13px]">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Dropdowns

```html
<div class="dropdown-menu">
  <div class="dropdown-item">
    <svg class="w-4 h-4">...</svg>
    Action
  </div>
</div>
```

```css
.dropdown-menu {
  min-width: 160px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 3px;
}

.dropdown-item {
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 4px;
  color: #52525b;
}
```

---

## Colors Reference

### Primary Palette

| Token          | Value       | Usage                   |
| -------------- | ----------- | ----------------------- |
| `primary`      | `#76c044`   | Buttons, links, accents |
| `primary-dark` | `#5ea031`   | Hover states            |
| `primary/10`   | 10% opacity | Background tints        |

### Semantic Colors

| State   | Background    | Text             |
| ------- | ------------- | ---------------- |
| Success | `bg-green-50` | `text-green-700` |
| Warning | `bg-amber-50` | `text-amber-700` |
| Error   | `bg-red-50`   | `text-red-700`   |
| Info    | `bg-blue-50`  | `text-blue-700`  |

### Gray Scale (Zinc-based)

| Token      | Value     | Usage                    |
| ---------- | --------- | ------------------------ |
| `gray-50`  | `#fafafa` | Page background          |
| `gray-100` | `#f4f4f5` | Subtle borders, dividers |
| `gray-400` | `#a1a1aa` | Muted text, timestamps   |
| `gray-500` | `#71717a` | Secondary text           |
| `gray-600` | `#52525b` | Body text                |
| `gray-900` | `#18181b` | Headings                 |

---

## Checklist for New Pages

When creating a new page, verify:

- [ ] Header height is `48px`
- [ ] Page title uses `text-xl font-semibold`
- [ ] Body text is `text-[13px]` or `text-sm`
- [ ] Card padding is `p-4`
- [ ] Border radius is `rounded-lg` (not `rounded-xl` or `rounded-2xl`)
- [ ] Border color is `border-gray-100` (not `border-gray-200`)
- [ ] No `font-bold` usage (use `font-semibold` max)
- [ ] Badges use `text-[11px] font-medium`
- [ ] Table rows use `py-2` padding
- [ ] Modals have backdrop blur and proper ARIA attributes

---

## Files Reference

- **Theme tokens**: `components/theme.html`
- **Design system showcase**: `components/design-system.html`
- **Reference table page**: `crm/customers.html`
- **Reference dashboard**: `dashboard/index.html`

---

_Last updated: February 2026_
