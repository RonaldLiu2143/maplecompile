# MapleCompile

Free MapleStory GMS tools — character lookup, combat power scouter, equipment & flames, star force, boss income, liberation, HEXA fragments, and a local roster dashboard.

**Live:** [https://maplecompile.vercel.app](https://maplecompile.vercel.app)

## Features

| Area | Route | Notes |
|------|--------|--------|
| Dashboard | `/dashboard` | Active Character, dailies / weeklies, tool shortcuts |
| Character Search | `/calc/character` | MapleRanks-style profile (inline); Saved bookmarks (separate from roster) |
| Scouter | `/calc/scouter` | Combat power, local presets, embedded equipment + set effects, gallery share |
| Scouter Gallery | `/calc/scouter/gallery` | Public shared loadouts; open a post with **Gallery** / **Open in Scouter** |
| Starforce | `/calc/starforce` | GMS v269 Star Force sim (modes, MVP/events, optimizer, fodder) |
| Flame Calculator | `/calc/equips/flames` | Flame tables & odds; optional load from a saved Scouter preset |
| Cubing | `/calc/cubing` | Cube / meso odds for lines |
| Class Rotations | `/calc/rotations` | Drag-and-drop skill priority; save locally and import on Scouter |
| Boss Income | `/calc/bosses` | Weekly crystals, MapleHub mule presets, reset timer |
| Liberation | `/calc/liberation` | Genesis / Destiny traces (party cap 3 on late bosses) |
| HEXA / Fragments | `/calc/hexa-tracker` | HEXA levels & fragment ETA (per character) |
| Diary | `/calc/diary` | Drop / progress diary |
| Roster | `/roster` | Multi-character manager |
| Guide | `/guide` | How to use the tools |
| About | `/about` | Project, local-first storage, affiliation |
| All tools | `/services` | Directory of every calculator |
| FAQ | `/faq` | Common questions |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms and conditions |
| Accessibility | `/accessibility` | Accessibility statement |

Equipment Setup (`/calc/equips/setup`) and Upgrade Planner (`/calc/planner`) still exist as routes; primary gear editing is on **Scouter**. Starforce / Flames / Cubing live under **Tools** in the nav.

Most progress is stored in the browser (`localStorage`). Active Character links tools across the site; Character Search **Saved** is a separate bookmark list from the roster.

## Setup

```bash
npm install
npm run seed   # pull equips / set-effects into data/
npm run dev
```

Local: [http://localhost:3000](http://localhost:3000)

### Environment (optional)

**Scouter share / gallery** needs [Upstash Redis](https://upstash.com/):

```bash
UPSTASH_REDIS_REST_URL=https://….upstash.io
UPSTASH_REDIS_REST_TOKEN=…
```

Set these in `.env.local` and Vercel. Without them, local presets still work; Share returns a clear “not configured” error.

Optional site URL for SEO / canonicals (defaults to the Vercel production host). Point this at your **custom domain** once DNS is attached in Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://maplecompile.vercel.app
```

Optional **Google Analytics 4** (omit to keep the site analytics-free):

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

> **Deploy note:** `vercel.json` disables Git-triggered deploys. Ship production with  
> `npx vercel deploy --prod --yes`.

## Character lookup (GMS)

No Nexon Open API key. Server merges public sources:

1. **Nexon rankings** — avatar, world, job, level, EXP, ranks, fame  
2. **MapleHub** — legion, class/world ranks, EXP graphs (when tracked)

App API: `GET /api/character?name=IGN&region=na|eu`

UI: search and profile on `/calc/character?name=…&region=na|eu`  
(Legacy `/calc/character/[name]` redirects to the query form.)

Ranked / MapleHub-tracked characters only. Gear and combat power from Open API remain unavailable without a key.

## Data

`npm run seed` downloads equip / set-effect JSON (WhackyBeanz-style public APIs) into:

- `data/equips/{jobType}/{charType}.json`
- `data/set-effects/{jobType}.json`

Served by `/api/equips/[jobType]/[charType]` and `/api/set-effects/[jobType]`.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript  
- Tailwind CSS 4  
- Upstash Redis (optional, for shares)

## License / credits

Community tools inspired by MapleHub, MapleRanks, MapleScouter, and WhackyBeanz-style equipment data. MapleStory is © Nexon.
