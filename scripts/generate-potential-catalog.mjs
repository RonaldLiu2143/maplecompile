/**
 * Regenerates `src/lib/cubing/potentialCatalog.json` from `cubeRates.json`.
 *
 * Run: `node scripts/generate-potential-catalog.mjs`
 *
 * Catalog keeps only Heroic-relevant numeric lines used by Equip Setup
 * dropdowns (ATT%/Boss%/IED%/stat%/CD/meso/drop/crit dmg, etc.).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cubeRates = JSON.parse(
  fs.readFileSync(path.join(root, "src/lib/cubing/cubeRates.json"), "utf8"),
);

const USEFUL = new Map([
  ["ATT %", "attPercent"],
  ["MATT %", "mattPercent"],
  ["Boss Damage", "bossPercent"],
  ["Ignore Enemy Defense %", "iedPercent"],
  ["Damage %", "damagePercent"],
  ["Critical Chance %", "critChance"],
  ["STR %", "mainStatPercent"],
  ["DEX %", "mainStatPercent"],
  ["INT %", "mainStatPercent"],
  ["LUK %", "mainStatPercent"],
  ["All Stats %", "allStatPercent"],
  ["Max HP %", "hpPercent"],
  ["Critical Damage %", "critDamage"],
  ["Skill Cooldown Reduction", "skillCooldown"],
  ["Meso Amount %", "mesoPercent"],
  ["Item Drop Rate %", "dropPercent"],
]);

const TIER_NAMES = ["rare", "epic", "unique", "legendary"];
const out = {};

for (const cat of Object.keys(cubeRates.lvl120to200).sort()) {
  out[cat] = {};
  for (const tier of TIER_NAMES) {
    const valuesById = new Map();
    const cubes = cubeRates.lvl120to200[cat];
    for (const cube of Object.keys(cubes)) {
      const data = cubes[cube][tier];
      if (!data) continue;
      for (const slot of ["first_line", "second_line", "third_line"]) {
        for (const row of data[slot] || []) {
          const [name, val] = row;
          const id = USEFUL.get(name);
          if (!id || typeof val !== "number") continue;
          if (!valuesById.has(id)) valuesById.set(id, new Set());
          valuesById.get(id).add(val);
        }
      }
    }
    const lines = [];
    for (const [id, set] of [...valuesById.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      lines.push({ id, values: [...set].sort((a, b) => b - a) });
    }
    if (lines.length) out[cat][tier] = lines;
  }
}

const dest = path.join(root, "src/lib/cubing/potentialCatalog.json");
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${dest} (${fs.statSync(dest).size} bytes)`);
