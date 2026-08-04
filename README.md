# MapleCompile

Equipment Setup + Flame Calculator for MapleStory (inspired by WhackyBeanz).

## Setup

```bash
npm install
npm run seed   # pull equips / set-effects into data/
npm run dev
```

**Live:** [https://maplecompile.vercel.app](https://maplecompile.vercel.app)

Local: [http://localhost:3000](http://localhost:3000).

### Scouter share (Upstash Redis)

Shareable scouter loadouts need a free [Upstash Redis](https://upstash.com/) database:

1. Create a Redis database in the Upstash console.
2. Copy the REST URL and token into `.env.local` (local) and your Vercel project env (production):

```bash
UPSTASH_REDIS_REST_URL=https://….upstash.io
UPSTASH_REDIS_REST_TOKEN=…
```

3. Redeploy on Vercel after adding the env vars.

Until these are set, the Share button returns a clear “sharing not configured” error. Local presets still work without Redis.

## Pages

- `/calc/equips/setup` — job/character select, equip grid, set-effect totals
- `/calc/equips/flames` — flame tables, saved lines, better-flame probability
- `/calc/cubing` — cubing probability (cubes / mesos for desired lines)
- `/calc/scouter` — character scouter: range, expected damage, converted main stat
- `/calc/scouter/gallery` — public shared scouter loadouts
- `/calc/scouter/s/[id]` — open a shared scouter loadout by id
- `/calc/character` — GMS character lookup by name (Nexon public rankings)

Setup is stored in `localStorage` and shared with the flame page. Shared loadouts are stored in Upstash Redis.

### Character lookup (GMS)

No Nexon Open API key is required. MapleCompile proxies Nexon’s **public rankings** API server-side:

```
GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/{na|eu}
  ?type=overall&id=legendary&reboot_index=0|1&page_index=1&character_name=…
```

App route: `GET /api/character?name=IGN&region=na|eu`

This returns ranked characters only (level / world / job / avatar / overall rank / fame). It is **not** live online status, and Nexon does not publish last-login on this endpoint.

## Data

`npm run seed` downloads from WhackyBeanz public APIs into:

- `data/equips/{jobType}/{charType}.json`
- `data/set-effects/{jobType}.json`

Local routes: `/api/equips/[jobType]/[charType]`, `/api/set-effects/[jobType]`.
