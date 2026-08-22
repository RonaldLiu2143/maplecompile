---
name: MapleCompile
description: Unofficial MapleStory GMS calculators — Layer 4 tinted neutrals, Geist UI, Lucide chrome.
colors:
  background: "#0a0a0a"
  foreground: "#f5f5f5"
  surface: "#141414"
  surface-muted: "#1c1c1c"
  sidebar: "#050505"
  muted-foreground: "#b3b3b3"
  muted-soft: "#8a8a8a"
  border: "#2e2e2e"
  primary: "#f5f5f5"
  primary-hover: "#ffffff"
  primary-foreground: "#0a0a0a"
  danger: "#f87171"
  success: "#34d399"
  warning: "#d4d4d4"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "44px"
  nav-link:
    typography: "{typography.label}"
    height: "44px"
    padding: "8px 12px"
---

# MapleCompile design

Guided by [Why the 60-30-10 Rule is RUINING Your UI Designs](https://www.youtube.com/watch?v=66oOi9OLMCw) and [Every UI/UX Concept Explained in Under 10 Minutes](https://www.youtube.com/watch?v=EcbgbKtOELY).

## Overview

Operate-first product UI for MapleStory GMS players. Home is persuade-lite (IGN search hero). Calculators share one ink-neutral shell, sidebar navigation, and Geist typography. Do not restyle every tool independently.

## Colors

### Ink ramp (dark / Compile theme)

Four elevation layers — frame → canvas → raised surface → inset:

| Token | Hex | Role |
|-------|-----|------|
| `sidebar` | `#050505` | Sidebar frame (darkest) |
| `background` | `#0a0a0a` | Page canvas |
| `surface` | `#141414` | Cards, panels |
| `surface-muted` | `#1c1c1c` | Inset wells, table headers |
| `border` | `#2e2e2e` | Strokes (stay dim) |

Text steps on dark:

| Token | Hex | Role |
|-------|-----|------|
| `foreground` | `#f5f5f5` | Headings, primary labels |
| `muted-foreground` | `#b3b3b3` | Body secondary |
| `muted-soft` | `#8a8a8a` | Hints, metadata |

Primary actions use the **ink ramp** (white button on dark canvas, black on light). Semantic hues: `danger` red, `success` green; `warning` is a gray step, not gold.

Layer 4 OKLCH hue tints neutrals (Blue default). Light theme inverts: paper `#f4f4f4` canvas, white `#ffffff` surfaces.

## Typography

Geist is the default UI face. Inter and Plus Jakarta Sans are optional theme overrides.

### Minimum type steps (functional UI)

| Role | Size | Tailwind | Use |
|------|------|----------|-----|
| Body | 16px / 1rem | `text-base` | Form inputs, paragraphs (prevents iOS zoom) |
| UI label | 14px | `text-sm` | Section titles, table cells, buttons |
| Caption | 12px | `text-xs` | Metadata, badges, column hints — **floor for functional text** |
| Display | clamp 1.75–3rem | `font-display` | Page titles only |

**Do not use sub-12px (`text-[10px]`, `text-[11px]`, `text-[9px]`) for functional controls, labels, or data the user must read.** Game-faithful tooltips (equip editor) may stay smaller when mimicking in-game UI.

Prose measure: 45–75ch. Tabular nums for stats. Light-on-dark: slightly more line-height on long copy.

## Layout

- Max content width `max-w-7xl`; tool pages often `max-w-5xl`.
- Sidebar sticky on `md+`; bottom tab bar on mobile.
- Touch targets **minimum 44×44px** (`min-h-11`) for nav links, buttons, and form controls.
- Inputs keep `min-h-11` and `text-base` at all breakpoints (no `md:min-h-0` shrink).
- Wide tables: `TableScrollRegion` + horizontal scroll hint on narrow viewports.

## Elevation & Depth

Surfaces get lighter as they elevate (dark mode). One or two border strokes — no nested card stacks. Soft scrollbars via `.maple-scroll` / `.maple-table-scroll` tinted from accent + surface-muted.

## Shapes

Border radius `6–8px` (`rounded-md` / `rounded-lg`). No gradient text. Lucide icons beside nav and tool labels (consistent stroke).

## Components

- shadcn: `Button`, `AlertDialog`, `Collapsible`, `Tooltip`, `Sheet`.
- Sidebar links: ghost buttons, muted fill when active (not accent pill).
- Primary CTA: ink ramp button.
- Destructive flows: `ConfirmModal` / `AlertModal` (never native `confirm`/`alert`).
- Theme picker: appearance, six hue presets + custom HEX, font choice.

## Do's and Don'ts

**Do**

- One primary action per cluster.
- Honor `prefers-reduced-motion` (150ms ease-out color only).
- Visible focus rings on every interactive control.
- Name actions in button copy (“Post to gallery”, not “Submit”).

**Don't**

- Icon-card grids for tool lists (use icon + label rows).
- Uppercase kickers above headings.
- Sub-12px functional type.
- Shrink touch targets below 44px on desktop “for density”.
- Deploy to Vercel unless explicitly asked.
