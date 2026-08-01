# Maplehub

Equipment Setup + Flame Calculator for MapleStory (inspired by WhackyBeanz).

## Setup

```bash
npm install
npm run seed   # pull equips / set-effects into data/
npm run dev
```

**Live:** [https://maplecompile.vercel.app](https://maplecompile.vercel.app)

Local: [http://localhost:3000](http://localhost:3000).

## Pages

- `/calc/equips/setup` — job/character select, equip grid, set-effect totals
- `/calc/equips/flames` — flame tables, saved lines, better-flame probability
- `/calc/cubing` — cubing probability (cubes / mesos for desired lines)
- `/calc/scouter` — character scouter / converted main-stat input (MapleScouter)

Setup is stored in `localStorage` and shared with the flame page.

## Data

`npm run seed` downloads from WhackyBeanz public APIs into:

- `data/equips/{jobType}/{charType}.json`
- `data/set-effects/{jobType}.json`

Local routes: `/api/equips/[jobType]/[charType]`, `/api/set-effects/[jobType]`.
