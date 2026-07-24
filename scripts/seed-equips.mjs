/**
 * Seeds local equip + set-effect JSON from WhackyBeanz public APIs.
 * Run: npm run seed
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://www.whackybeanz.com";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EQUIPS_DIR = path.join(ROOT, "data", "equips");
const SETS_DIR = path.join(ROOT, "data", "set-effects");

const JOBS = {
  warrior: [
    "adele",
    "aran",
    "blaster",
    "dk",
    "da",
    "ds",
    "hayato",
    "hero",
    "len",
    "mihile",
    "kaiser",
    "paladin",
    "sm",
    "zero",
  ],
  magician: [
    "bam",
    "bs",
    "evan",
    "fp",
    "fw",
    "il",
    "illium",
    "kanna",
    "kinesis",
    "lara",
    "lumi",
    "lynn",
    "sia",
  ],
  archer: ["bm", "xbm", "kain", "merc", "pf", "wh", "wb"],
  thief: [
    "cadena",
    "db",
    "hy",
    "khali",
    "nl",
    "nw",
    "phantom",
    "sdw",
    "xenon",
  ],
  pirate: [
    "ab",
    "ark",
    "cm",
    "captain",
    "eunwol",
    "mech",
    "mx",
    "striker",
    "viper",
    "xenon",
  ],
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  await mkdir(EQUIPS_DIR, { recursive: true });
  await mkdir(SETS_DIR, { recursive: true });

  const index = { jobs: {}, generatedAt: new Date().toISOString() };

  for (const [jobType, chars] of Object.entries(JOBS)) {
    console.log(`Set effects: ${jobType}`);
    const sets = await fetchJson(`${BASE}/api/getSetEffects/${jobType}`);
    await writeFile(
      path.join(SETS_DIR, `${jobType}.json`),
      JSON.stringify(sets, null, 2),
    );
    index.jobs[jobType] = { chars: [] };

    for (const charType of chars) {
      const url = `${BASE}/api/getEquips/${jobType}/${charType}`;
      process.stdout.write(`  equips ${jobType}/${charType}... `);
      try {
        const data = await fetchJson(url);
        const dir = path.join(EQUIPS_DIR, jobType);
        await mkdir(dir, { recursive: true });
        await writeFile(
          path.join(dir, `${charType}.json`),
          JSON.stringify(data),
        );
        index.jobs[jobType].chars.push(charType);
        console.log("ok");
      } catch (err) {
        console.log(`FAIL ${err.message}`);
      }
      // be polite
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  await writeFile(
    path.join(ROOT, "data", "index.json"),
    JSON.stringify(index, null, 2),
  );
  console.log("Done. Wrote data/index.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
