# Jondi ça bouge — Design System

> This is the design system file for Jondi ça bouge. The common method for the whole portfolio is
> [../../docs/DESIGN-SYSTEM.md](../../docs/DESIGN-SYSTEM.md). UX principles (L1–L4, N1) are defined in
> [../../docs/UX-PRINCIPLES.md](../../docs/UX-PRINCIPLES.md). This file specifies how those principles apply
> to Jondi ça bouge's interface.

---

## 1. Identity

**Jondi ça bouge** shows every event in Dijon, filtered by interests, with Divia trip routes when the place is reliable.

- **Theme**: dark purple (from the mock-up of 12/10/2024)
- **Tone**: local, helpful, information-dense
- **Purpose**: bring traffic to event sources, never replace them (always link to the source)

---

## 2. Portfolio UX rules

> Reference: [../../docs/UX-PRINCIPLES.md](../../docs/UX-PRINCIPLES.md)

Jondi ça bouge follows the portfolio's UX principles L1–L4 and N1:

### L1 · No overlap

**Rule**: Two blocks never cover each other. A block that must sit over another is a **layer** (L2), and then the one below is dimmed or hidden.

**Application in Jondi ça bouge**:
- Event cards in the main list must not overlap each other or the header
- Filter panels, when open, dim the content below
- The "y aller" (trip) panel opens as a modal layer over the event details

**Zones**:
- **Top**: header with logo, search and filters (fixed height)
- **Main**: scrolling list of event cards
- **Detail layer**: event details sheet (overlay)
- **Trip layer**: Divia route panel (overlay, above detail)

### L2 · One layer at a time

**Rule**: When a layer opens (modal, panel, fullscreen view), **everything floating below it yields**: hidden, or dimmed to a backdrop with no pointer events.

**Layer ladder for Jondi ça bouge** (from back to front):
1. **base** (0): main event list, background
2. **ui** (10): header, cards
3. **detail** (20): event detail sheet
4. **trip** (30): Divia trip panel (when opened from event detail)
5. **overlay** (40): filters, settings

When the event detail opens, the main list is dimmed. When the trip panel opens, the event detail stays visible but dimmed behind it.

### L3 · Reserved zones, not free placement

**Rule**: Each element has a zone chosen by its expansion axis and rank. Users do **not** drag panels around to fix collisions.

**Zones in Jondi ça bouge**:
- **Header**: top, full width, fixed
- **Filter bar**: below header, full width, collapsible
- **Event list**: main area, grows downward, scrolls vertically
- **Event card**: within list, grows downward to show details
- **Detail sheet**: bottom sheet or side panel (depends on width), slides in from edge
- **Trip panel**: overlays detail sheet, slides from bottom

**Expansion axes**:
- Lists grow **downward** (events, trip steps)
- Rows of filters or actions grow **horizontally** (filter chips, action buttons)
- Gauges and counters stay in their **corner** (event count, applied filters count)

### L4 · Harmony

**Rule**: Space is balanced: inside a bar, header or button, space above = space below and left = right (± 2 px), from the spacing scale only (4 · 8 · 12 · 16 · 24 · 32). Equal-rank elements get equal sizes and gaps.

**Spacing scale for Jondi ça bouge**:
```css
--sp-1: 4px   /* tight spacing: between filter chips */
--sp-2: 8px   /* standard padding: inside cards, buttons */
--sp-3: 12px  /* comfortable spacing: card gaps, header padding */
--sp-4: 16px  /* section spacing: between header and list */
--sp-5: 24px  /* major spacing: between sections in detail */
--sp-6: 32px  /* large spacing: top/bottom of modals */
```

**Balance checks**:
- Event card: same padding top and bottom around content
- Header: logo/title on left, filters on right, equal vertical padding
- Detail sheet: same margin left and right
- Trip steps: equal gap between each step

### N1 · Deterministic navigation

**Rule**: Every screen state (view, open event, open panel, filters, fold) is written in the URL and replayed by it. Same URL ⇒ same screen.

**URL structure for Jondi ça bouge**:
```
/                           → main list
/?cat=music,cinema          → list filtered by categories
/?q=jazz                    → list filtered by search term
/?event=abc123              → list with event abc123's detail open
/?event=abc123&trip=true    → event detail + trip panel open
/?view=map                  → map view (future)
```

**States stored in URL**:
- Selected categories (`cat`)
- Search query (`q`)
- Selected date range (`from`, `to`)
- Open event id (`event`)
- Trip panel state (`trip`)
- View mode (`view`: list / map)

**Navigation replay**:
- Reading the URL on load restores filters, opens the event, shows the trip
- Closing a panel removes its param from URL
- Tests navigate by URL only: `/?event=test-event` must show that event's detail

---

## 3. Colors

**Main hue**: dark purple (HSL: 270°, 60%, 25%)

```css
:root {
  --hue-primary: 270;
  --bg: hsl(270, 60%, 8%);        /* deep purple background */
  --bg-elevated: hsl(270, 50%, 12%); /* cards, panels */
  --ink: hsl(270, 10%, 90%);      /* main text */
  --ink-dim: hsl(270, 10%, 60%);  /* secondary text */
  --ink-faint: hsl(270, 10%, 40%); /* disabled, borders */
  --accent: hsl(270, 70%, 60%);   /* links, active filters */
  --accent-bright: hsl(270, 80%, 70%); /* hover, focus */
}
```

**Category colors** (derived from activity axes):
- Culture: purple-blue (arts, theater, museums)
- Sports: green (outdoor, sports events)
- Social: orange (markets, gatherings, community)
- Learning: cyan (workshops, talks, education)

**Transport colors** (Divia official palette, used only in trip view):
- As specified by Divia (kept for recognition, exception to the purple theme in trip context)

---

## 4. Typography

**Families**:
- Primary: system font stack (clear, readable)
- Mono: for times, dates, distances

**Sizes** (mobile-first):
```css
--fs-s: 12px;  /* metadata, labels */
--fs-m: 14px;  /* body text, event titles */
--fs-l: 18px;  /* section titles, detail titles */
--fs-xl: 24px; /* page title */
```

---

## 5. Components

**Event card**:
- Title (--fs-m, bold)
- Date/time + venue (--fs-s, --ink-dim)
- Category badge (--fs-s, category color)
- "y aller" button (only if coordinates are reliable)
- Link to source (always present)

**Filter chip**:
- Rounded, --sp-1 padding
- Outline style when inactive, filled when active
- Icon + label

**Detail sheet**:
- Full event info
- Large title (--fs-l)
- Description (--fs-m, line-height: 1.5)
- Link to source (prominent)
- "y aller" button (triggers trip panel)

**Trip panel**:
- List of steps (walk, bus, bike)
- Each step: mode icon, duration, instruction
- Total time and distance at top

---

## 6. Interactions

**No hover movement**: borders, colors and fills change on hover, never `translate`, `rotate` or `scale`.

**Touch targets**: buttons ≥ 44 px on touch devices (filter chips, "y aller" button).

**Transitions**:
```css
--t-fast: 150ms;  /* hover, press */
--t-slow: 300ms;  /* panel open/close, filter apply */
```

---

## 7. Responsive zones

| Breakpoint | Layout |
|---|---|
| < 768 px (mobile) | Single column, bottom sheets for detail and trip |
| 768–1024 px (tablet) | Single column, side panel for detail (right 40%) |
| > 1024 px (desktop) | Main list (60%) + permanent detail pane (40%) when event selected |

**Layer behavior**:
- Mobile: detail and trip are full-screen overlays (z-index 20, 30)
- Tablet/desktop: detail is a side pane, trip is an overlay

---

## 8. Checks

- **`design-lint`**: `node ../tools/design-lint.mjs jondi_ca_boouge` (from portfolio root)
- **`check-overlap`**: skill `check-overlap` on main routes (list, detail, trip)
- **Captures**: 1920 / 1440 / 1280 width, with and without event detail open

---

## 9. Decisions

1. **No pin without reliable coordinates** (stated in CLAUDE.md): an event without precise location has no "y aller" button and no map pin.
2. **Dark purple theme** (from 12/10 mock-up): the main hue is purple (270°), not blue or cyan.
3. **Always link to source** (stated in CLAUDE.md): the app brings traffic to sources, it does not replace them.
4. **Interface language is French** (stated in CLAUDE.md): the UI is for a local Dijon audience; translation to `i18n/` is deferred.
