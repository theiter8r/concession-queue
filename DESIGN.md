---
name: Railway Concession
description: Slot-based concession form issuance for K.C. College of Engineering
colors:
  neutral-bg: "#fafaf9"
  neutral-bg-elevated: "#ffffff"
  ink: "#1c1917"
  ink-muted: "#57534e"
  ink-faint: "#a8a29e"
  border-light: "#e7e5e4"
  border-strong: "#d6d3d1"
  danger: "#b91c1c"
  ok: "#15803d"
  warn: "#b45309"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'SF Pro Text', 'Inter', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.neutral-bg-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 14px"
  card:
    backgroundColor: "{colors.neutral-bg-elevated}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.neutral-bg-elevated}"
    rounded: "{rounded.sm}"
    borderColor: "{colors.border-light}"
---

# Design System: Railway Concession

## 1. Overview

**Creative North Star: "The Direct Line"**

Clean, fast, and candid — this is a desk that faces the student, not the institution. No corporate gloss, no decorative friction, no waiting for things that don't matter. Every screen has one job, every interaction gives tactile feedback, and the page gets out of the way the moment the user knows what to do.

The system explicitly rejects generic SaaS visual language: no gradient text, no glassmorphism, no hero-metric templates, no thick colored side stripes, no repeating decorative backgrounds. The palette is deliberately tight — a monochromatic stone scale with three semantic signal colors (ok, warn, danger). The accent IS the foreground, not a secondary brand color. Depth comes from tonal layering (elevated surfaces against the body), not from shadows or gradients. Buttons compress on press (scale 0.97) for the only motion that matters: tactile confirmation of agency.

**Key Characteristics:**
- Monochromatic, high-contrast palette — no brand color as accent
- Flat-ish surfaces with tonal elevation, not shadow depth
- Tactile micro-interactions (button press, focus rings)
- Mobile-first, content-first layouts
- No CSS framework — every primitive hand-rolled and intentional

## 2. Colors

The palette is a narrow band of warm stone neutrals with the accent color collapsed into the foreground. There is no secondary brand color — emphasis is communicated through weight, position, and contrast ratio rather than chromatic accent.

### Primary
- **Ink** (#1c1917 / oklch(0.21 0.02 70)): The single accent color. Used for body text, primary buttons, focus rings, and active states. In dark mode, ink inverts to white (#fafaf9). Not used decoratively.

### Neutral
- **Bone** (#fafaf9 / oklch(0.97 0.005 80)): Page background (light mode). The surface everything sits on.
- **Paper** (#ffffff): Elevated surface background — cards, input backgrounds, modals. One step above Bone.
- **Pumice** (#57534e / oklch(0.42 0.015 70)): Muted body text, secondary labels, help text. The second voice.
- **Ash** (#a8a29e / oklch(0.72 0.01 70)): Faint text, placeholder text, non-interactive metadata.
- **Ledge** (#e7e5e4 / oklch(0.92 0.005 70)): Default borders between surfaces.
- **Ledge-strong** (#d6d3d1 / oklch(0.87 0.008 70)): Stronger borders for focused or emphasized containers.

### Semantic
- **OK** (#15803d): Success states, confirmed status badges.
- **Warn** (#b45309): Warning states, expiring items.
- **Danger** (#b91c1c): Destructive actions, errors, critical status.

### The One-Accent Rule
The accent is the foreground color. It does not appear as a separate brand hue. Chromatic color (indigo, teal, etc.) is prohibited in UI chrome; faint chromatic blurs behind hero sections are permitted only on the landing page and only at ≤22% opacity.

## 3. Typography

**Display / Body Font:** System UI stack (`ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Inter", sans-serif`)

**Character:** Neutral, legible, no stylistic ambition. The font choice is deliberately invisible — no distinctive character that would compete with the content. This is the typography equivalent of plain language.

### Hierarchy
- **Display** (600 weight, `clamp(34px, 7vw, 60px)`, 1.04 line-height, -1.2px letter-spacing): Landing page hero headline only. `text-wrap: balance`.
- **Headline** (600 weight, `clamp(26px, 4vw, 36px)`, 1.2 line-height, -0.6px letter-spacing): Section headings. `text-wrap: balance`.
- **Title** (600 weight, 24px, 1.3 line-height, -0.3px): Page titles in app shell.
- **Body** (400 weight, 14px, 1.5): All prose, form labels, descriptions. Max line length 65–75ch.
- **Label** (500 weight, 12px, 1.4, uppercase 0.08em tracking): Eyebrows, table headers, chip labels.

### Rules
- **The System Font Rule.** No custom typeface is loaded. The system UI stack is fast, native-feeling, and avoids both the "Inter in every AI project" reflex and the "designer typeface" pretension.
- Display heading letter-spacing never below -0.04em on the clamped max. At -1.2px on 60px, that's -0.02em — safe.

## 4. Elevation

The system uses tonal layering for depth, not shadow dispersion. Surfaces sit one step above the background (Paper on Bone) and may carry a minimal shadow (`--shadow-sm: 0 1px 2px rgba(0,0,0,0.04)`) at card edges. Only the landing page preview card earns the full shadow (`0 24px 60px -28px rgba(0,0,0,0.25)`).

### The Flat-By-Default Rule
Most surfaces have no shadow. Depth is conveyed by the background color change (Bone → Paper). Shadows are reserved for hover states, dropdown menus, and the single hero preview card. No inner shadows, no gradient overlays for depth.

### Elevation Scale
- **Surface (resting):** `background: var(--bg)` — no shadow
- **Elevated (cards, inputs):** `background: var(--bg-elevated)`, `box-shadow: var(--shadow-sm)` — subtle 1px boundary
- **Hero (preview card only):** `box-shadow: 0 24px 60px -28px rgba(0,0,0,0.25), 0 4px 12px -6px rgba(0,0,0,0.08)`
- **Modal/Drawer:** (if added) `background: var(--bg-elevated)`, `box-shadow: var(--shadow)`

## 5. Components

### Buttons
- **Shape:** Gently rounded (6px radius). Compact by default (36px height).
- **Primary:** Filled ink background, white text (`--accent` / `--accent-fg`). Active press: `scale(0.97)` with 140ms ease-out.
- **Secondary:** Paper background, ink border, ink text. The default variant.
- **Ghost:** Transparent background, no border. Used for secondary inline actions.
- **Danger:** Red background, white text (`--danger`).
- **Focus:** 2px gap + 4px semi-transparent ink ring (`--accent at 50%`). `transform` transitions are isolated from `background`/`border-color`/`opacity` so hover press doesn't fight frame interpolation.
- **Hover (pointer devices only):** 4% ink tint on background (`color-mix(in oklab, var(--accent) 4%, var(--bg-elevated))`). Gated behind `@media (hover: hover) and (pointer: fine)`.

### Cards / Containers
- **Corner Style:** Rounded (14px radius) — noticeably softer than buttons.
- **Background:** Paper (`--bg-elevated`).
- **Shadow:** `--shadow-sm` only (1px blur, barely visible). No card should appear to float.
- **Border:** 1px solid Ledge (`--border`).
- **Internal Padding:** 22px (compact) or 28px (generous).

### Inputs / Fields
- **Style:** Paper background, 1px Ledge border, 6px radius. 36px height for single-line fields.
- **Focus:** Border shifts to ink. 3px semi-transparent ink glow ring (`color-mix(in oklab, var(--accent) 18%, transparent)`). Transitions on `border-color` and `box-shadow` at 160ms ease-out.
- **State:** Disabled at 50% opacity. Error via border-color shift (not implemented yet — inherited styles should use `--danger`).

### Badges / Chips
- **Shape:** Full pill (999px radius). 22px height, 12px font.
- **Tones:** `neutral` (Bone bg), `ok` (green tint), `warn` (amber tint), `danger` (red tint). Tints use `color-mix` at 12% of the semantic color.

### Navigation
- **Landing page:** Inline brand + CTA links. No persistent nav bar.
- **App shell:** Minimal — page titles in the `<Page>` shell, with action buttons in the header slot. No sidebar navigation.

### Page Shell
- **Container:** `max-width: 960px`, centered. Padding 16px on mobile, 24–32px on desktop.
- **Header:** Title + optional subtitle + optional action slot. Stacks vertically on mobile, row on desktop (560px+).

## 6. Do's and Don'ts

### Do:
- **Do** use ink (`--fg`) as the only emphasis color. Let weight, size, and position do the work of a second color.
- **Do** use `color-mix(in oklab, ... alpha)` for all tinted variants — hover states, badge backgrounds, focus rings. Never define a separate hover hex.
- **Do** keep buttons compact (36px default height, 28px small). The interface is for fast task completion, not decorative exploration.
- **Do** use tonal elevation (Bone → Paper) instead of shadows for surface hierarchy.
- **Do** gate hover effects behind `@media (hover: hover) and (pointer: fine)` — touch devices should never show a sticky hover.
- **Do** honor `prefers-reduced-motion` with shorter durations and disabled parallax.

### Don't:
- **Don't** use gradient text (`background-clip: text` + gradient). Single solid color for emphasis.
- **Don't** add a separate brand accent color. Ink/Foreground is the accent.
- **Don't** use glassmorphism (backdrop-blur on semi-transparent surfaces).
- **Don't** use hero-metric layouts (big number, small label, supporting stats, gradient).
- **Don't** use repeated card grids with identical icon + heading + body structure.
- **Don't** use the small uppercase tracked "eyebrow" above every section. One per page is the limit.
- **Don't** use numbered section markers (01 / 02 / 03) unless the steps are an actual ordered sequence the user must follow.
- **Don't** add decorative SVG illustrations, especially sketchy or hand-drawn ones.
- **Don't** use `repeating-linear-gradient` stripe backgrounds or two-axis CSS grid overlays as decoration.
- **Don't** pair `border: 1px solid` with `box-shadow` blur ≥ 16px on the same element. Pick one.
- **Don't** over-round cards beyond 16px. Buttons stay at 6px; cards at 14px.
- **Don't** use bounce or elastic easings. Use `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for all exit transitions.
