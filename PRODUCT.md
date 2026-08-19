# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

MapleStory GMS players who track a main, alts, combat power, gear, bosses, HEXA, and liberation in a browser. They are often mid-session with the game open and need a lookup or number, not a marketing story.

## Product Purpose

MapleCompile is an unofficial set of free GMS calculators and roster tools. Success is: find a character, lock a main, fill Scouter, then use bosses / HEXA / liberation without making an account.

## Positioning

Progress stays on the device (localStorage) unless the player shares a scouter post. Character lookup uses public rankings plus MapleHub-style data, not Nexon login.

## Capabilities

- Character search and roster
- Scouter (combat power) with equipment on the same page
- Boss income, liberation, HEXA / fragments, diary
- Shared gallery posts (optional, Redis-backed)
- Themes and wallpapers

## Constraints

- Unofficial; not affiliated with Nexon
- No account system
- Do not invent game formulas or claim official affiliation
- Do not deploy to Vercel unless the user asks

## Terminology

- IGN: in-game name
- Active Character: locked main used by tools
- Scouter: combat-power calculator
- HEXA: sixth-job matrix / Sol Erda fragments

## Voice

Direct, specific, game-literate. Controls name the action. No hype, no “AI slop” eyebrows, no fake testimonials.

## Accessibility

Body text contrast ≥ 4.5:1. Primary actions at least 44px tall. Keyboard focus visible. Respect `prefers-reduced-motion`. Skip link to `#main-content`.
