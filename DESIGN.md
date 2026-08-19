---
name: MapleCompile
description: Unofficial MapleStory GMS calculators — maple-night UI, warm ink layers, gold action ramp, serif titles.
colors:
  background: "#120e0c"
  foreground: "#f4ebe1"
  primary: "#c9a227"
  primary-hover: "#e0bc4a"
  primary-foreground: "#1a1408"
  surface: "#1c1612"
  muted: "#261e18"
  muted-foreground: "#c4b8aa"
  border: "#3a3028"
  sidebar: "#0c0a08"
  danger: "#f87171"
  success: "#34d399"
  warning: "#fbbf24"
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

Four background layers: darker sidebar frame, canvas, raised surface, inset muted — warm ink, not zinc (`#120e0c` → `#1c1612` → `#261e18`). One or two strokes, three text steps (heading, body, subtext). Maple gold is a functional ramp (rest / hover / pressed), not a 30% fill. Semantic red / green / amber stay those hues. Dark mode: wider steps between neutrals; surfaces get lighter as they elevate; borders stay dim. Light mode: warm paper canvas so white-warm cards can lift; important buttons are the darker gold.

Source Serif 4 for large titles and the wordmark. IBM Plex Sans for body, nav, buttons, tables, and data. Optional wallpapers sit behind a dim overlay — amber/ember meshes only.

## Hierarchy

One primary action per cluster. Search is the home hero; Guide and Scouter are ghost buttons. Headings carry their own weight — no uppercase kickers. Active nav is a quiet fill, not a gold pill. Lists for tools, not icon-card grids.

## Motion

150ms ease-out on color. No bounce. Honor `prefers-reduced-motion`. Every control needs hover, active, disabled, and a visible focus ring.

## Components

Use shadcn `Button`, `AlertDialog`, `Collapsible`, `Tooltip`. Primary buttons use the gold ramp. Sidebar links are ghost buttons with an accent-soft selected state.
