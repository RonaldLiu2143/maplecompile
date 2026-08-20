---
name: MapleCompile
description: Unofficial MapleStory GMS calculators — Layer 4 tinted neutrals, Geist UI, Lucide chrome.
colors:
  background: "#0a0a0a"
  foreground: "#f5f5f5"
  primary: "#3b82f6"
  primary-hover: "#60a5fa"
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

Four background layers: darker sidebar frame, canvas, raised surface, inset muted — cool ink neutrals (`#0a0a0a` → `#141414` → `#1c1c1c`), tinted with a Layer 4 OKLCH hue (Blue by default). One or two strokes, three text steps (heading, body, subtext). Semantic red / green stay those hues; warning is a gray step, not gold. Dark mode: wider steps between neutrals; surfaces get lighter as they elevate; borders stay dim. Light mode: paper-gray canvas so white cards can lift. Lucide icons sit next to labels in nav, tools, search, footer, and chrome.

Geist is the default typeface (modern, clean, technical). Inter and Plus Jakarta Sans are optional. Line charts use Apache ECharts: basic line series, category x-axis ticks aligned with labels.

## Hierarchy

One primary action per cluster. Search is the home hero; Guide is a text dismiss. Headings carry their own weight — no uppercase kickers. Active nav is a quiet fill, not an accent pill. Lists for tools with a Lucide icon beside each label, not icon-card grids. Theme picker is appearance, six color presets plus custom HEX/graph, and type.

## Motion

150ms ease-out on color. No bounce. Honor `prefers-reduced-motion`. Every control needs hover, active, disabled, and a visible focus ring.

## Components

Use shadcn `Button`, `AlertDialog`, `Collapsible`, `Tooltip`. Primary buttons use the ink ramp (white on dark, black on light). Sidebar links are ghost buttons with a muted selected state.
