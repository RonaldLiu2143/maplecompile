---
name: MapleCompile
description: Unofficial MapleStory GMS calculators — four-layer zinc product UI, sky action ramp, IBM Plex.
colors:
  background: "#141820"
  foreground: "#eceef2"
  primary: "#38bdf8"
  primary-hover: "#7dd3fc"
  primary-foreground: "#0c1220"
  surface: "#1e2430"
  muted: "#2a3140"
  muted-foreground: "#a8b0bd"
  border: "#2e3646"
  sidebar: "#10141a"
  danger: "#f87171"
  success: "#34d399"
  warning: "#fbbf24"
typography:
  display:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.025em"
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

Four background layers: darker sidebar frame, canvas, raised surface, inset muted. One or two strokes, three text steps (heading, body, subtext). Sky is a functional ramp (rest / hover / pressed), not a 30% fill. Semantic red / green / amber stay those hues even if the brand is sky. Dark mode: wider steps between neutrals; surfaces get lighter as they elevate; borders stay dim. Light mode: canvas is not pure white so white cards can lift with a soft shadow; important buttons are the darker sky.

IBM Plex Sans for UI and display. Optional wallpapers sit behind a dim overlay.

## Hierarchy

One primary action per cluster. Search is the home hero; Guide and Scouter are ghost buttons. Headings carry their own weight — no uppercase kickers. Active nav is a quiet fill, not a sky pill. Lists for tools, not icon-card grids.

## Motion

150ms ease-out on color. No bounce. Honor `prefers-reduced-motion`. Every control needs hover, active, disabled, and a visible focus ring.

## Components

Use shadcn `Button`, `AlertDialog`, `Collapsible`, `Tooltip`. Primary buttons use the accent ramp. Sidebar links are ghost buttons with an accent-soft selected state.
