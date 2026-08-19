---
name: MapleCompile
description: Unofficial MapleStory GMS calculators — dark zinc canvas, sky accent, IBM Plex.
colors:
  background: "#0f1218"
  foreground: "#f4f4f5"
  primary: "#38bdf8"
  primary-foreground: "#0c1220"
  surface: "#1a1e27"
  muted: "#252a36"
  muted-foreground: "#c4c4cc"
  border: "#4b5563"
  danger: "#f87171"
typography:
  display:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
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

## Product surface

Operate first (calculators, dashboard). Home is persuade-lite: get an IGN into search. Guide is read: five steps, then a tool list. Do not restyle every calculator independently.

## Visual world

Dark zinc field, sky `#38bdf8` as the only loud color. IBM Plex Sans for UI and display. Optional wallpapers sit behind a dim overlay; cards stay opaque enough to read. Light and Contrast themes exist; Compile is default.

## Hierarchy

One primary action per cluster. Headings carry their own weight — no uppercase kickers above titles. Lists and tables for tools, not a grid of identical icon-cards. Do not nest cards in cards.

## Color

Primary buttons use sky. Body copy uses foreground / muted-foreground, never gray-on-sky. Destructive is `--danger`. Selection, focus ring, and scroll thumbs use the accent.

## Motion

Hover 150–200ms. No bounce, no entrance on every section. Honor `prefers-reduced-motion`.

## Components

Use shadcn `Button`, `AlertDialog`, `Collapsible`, `Tooltip`. Prefer `Button` + spacing over wrapping every region in `Card`. Sidebar is `bg-sidebar`.
