---
name: MapleCompile
description: Unofficial MapleStory GMS calculators — ink UI, black and white action ramp, serif titles.
colors:
  background: "#0a0a0a"
  foreground: "#f5f5f5"
  primary: "#f5f5f5"
  primary-hover: "#ffffff"
  primary-foreground: "#0a0a0a"
  surface: "#141414"
  muted: "#1c1c1c"
  muted-foreground: "#b3b3b3"
  border: "#2e2e2e"
  sidebar: "#050505"
  danger: "#f87171"
  success: "#34d399"
  warning: "#d4d4d4"
typography:
  display:
    fontFamily: "Source Serif 4, ui-serif, Georgia, serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
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
---

# MapleCompile design

Guided by [Why the 60-30-10 Rule is RUINING Your UI Designs](https://www.youtube.com/watch?v=66oOi9OLMCw) and [Every UI/UX Concept Explained in Under 10 Minutes](https://www.youtube.com/watch?v=EcbgbKtOELY).

## Product surface

Operate first. Home is persuade-lite: the IGN search is the one focal action. Guide is read. Do not restyle every calculator independently.

## Visual world

Four background layers: darker sidebar frame, canvas, raised surface, inset muted — cool ink by default (`#0a0a0a` → `#141414` → `#1c1c1c`). Theme → Color can tint those neutrals in OKLCH (L−0.03, C+0.02, pick a hue) so the same UI can go red, green, or blue without a 60-30-10 fill. One or two strokes, three text steps (heading, body, subtext). White (dark) / black (light) is the Ink action ramp; a hue replaces that ramp with a 400/500 (light) or 300/400 (dark) of the same hue. Semantic red / green stay those hues; warning is a gray step, not gold. Dark mode: wider steps between neutrals; surfaces get lighter as they elevate; borders stay dim. Light mode: paper-gray canvas so white cards can lift; important buttons are black unless a hue is on.

Source Serif 4 for large titles and the wordmark. IBM Plex Sans for body, nav, buttons, tables, and data. Optional wallpapers sit behind a dim overlay — grayscale meshes only.

## Hierarchy

One primary action per cluster. Search is the home hero; Guide is a text dismiss. Headings carry their own weight — no uppercase kickers. Active nav is a quiet fill, not an accent pill. Lists for tools, not icon-card grids.

## Motion

150ms ease-out on color. No bounce. Honor `prefers-reduced-motion`. Every control needs hover, active, disabled, and a visible focus ring.

## Components

Use shadcn `Button`, `AlertDialog`, `Collapsible`, `Tooltip`. Primary buttons use the ink ramp (white on dark, black on light). Sidebar links are ghost buttons with a muted selected state.
