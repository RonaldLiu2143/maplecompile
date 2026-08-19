# MapleCompile

Free MapleStory GMS tools — character lookup, combat power scouter, equipment & flames, boss income, liberation, HEXA fragments, and a local roster dashboard.

**Live:** [https://maplecompile.vercel.app](https://maplecompile.vercel.app)

## Features

| Area | Route | Notes |
|------|--------|--------|
| Dashboard | `/dashboard` | Active Character, dailies / weeklies, tool shortcuts |
| Character Search | `/calc/character` | MapleRanks-style profile (inline), Saved bookmarks (separate from roster) |
| Scouter | `/calc/scouter` | Combat power, presets, equipment setup, gallery share |
| Scouter Gallery | `/calc/scouter/gallery` | Public shared loadouts |
| Equipment Setup | `/calc/equips/setup` | Gear grid + set effects (also embedded on Scouter) |
| Flames | `/calc/equips/flames` | Flame tables & probabilities |
| Cubing | `/calc/cubing` | Cube / meso odds for lines |
| Upgrade Planner | `/calc/planner` | Progression planning |
| Boss Income | `/calc/bosses` | Crystal / boss income |
| Liberation | `/calc/liberation` | Liberation tracker |
| HEXA / Fragments | `/calc/hexa-tracker` | HEXA levels & fragment tracking (per character) |
| Diary | `/calc/diary` | Drop / progress diary |
| Roster | `/roster` | Multi-character manager |
| About | `/about` | Project, local-first storage, affiliation |
| Tools | `/services` | Directory of every calculator |
| FAQ | `/faq` | Common questions |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms and conditions |
| Accessibility | `/accessibility` | Accessibility statement |

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
> `npx vercel deploy --prod --yes --scope <your-team-scope>`.

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
