#!/usr/bin/env node
/** Generate skeleton rotation JSON + class-data registry. Overwrites nl/bs/hero with seeds. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "src/lib/rotations/data");

const CHAR_TYPES = [
  "adele", "aran", "blaster", "dk", "da", "ds", "hayato", "hero", "len", "mihile",
  "kaiser", "paladin", "sm", "zero", "bam", "bs", "evan", "fp", "fw", "il", "illium",
  "kanna", "kinesis", "lara", "lumi", "lynn", "sia", "bm", "xbm", "kain", "merc", "pf",
  "wh", "wb", "cadena", "db", "hy", "khali", "nl", "nw", "phantom", "sdw", "xenon",
  "ab", "ark", "cm", "captain", "eunwol", "mech", "mx", "striker", "viper",
];

function hexaIcon(prefix, n) {
  return `/hexaskill/${prefix}_${n}.png`;
}

function hexaSkills(prefix, labels) {
  const slots = [
    [0, 2, "mastery"], [1, 7, "mastery"], [2, 8, "mastery"], [3, 9, "mastery"],
    [4, 3, "rein"], [5, 4, "rein"], [6, 5, "rein"], [7, 6, "rein"],
    [8, 1, "skill"], [9, 10, "skill"],
    [12, null, "solJanus"], [13, null, "solHecate"],
  ];
  const out = [];
  for (const [idx, iconN, kind] of slots) {
    const name = labels[idx];
    if (!name) continue;
    let iconSuffix = iconN != null ? hexaIcon(prefix, iconN) : null;
    if (kind === "solJanus") iconSuffix = "/hexaskill/General/General_1_0.png";
    if (kind === "solHecate") iconSuffix = "/hexaskill/General/General_2.png";
    const isOrigin = idx === 8;
    out.push({
      id: `hexa-${idx}`,
      name,
      category: "hexa",
      iconSuffix,
      hexaSlot: idx,
      cooldownSec: isOrigin ? 360 : kind === "solJanus" || kind === "solHecate" ? 60 : 0,
      durationSec: isOrigin ? 30 : kind === "solJanus" ? 20 : kind === "solHecate" ? 15 : 0,
      delaySec: 1,
    });
  }
  return out;
}

const NL = {
  charType: "nl",
  patchNote: "GMS wiki-seeded — verify cooldowns/durations",
  skills: [
    { id: "shadow-partner", name: "Shadow Partner", category: "class_buff", cooldownSec: 180, durationSec: 180 },
    { id: "dark-sight", name: "Dark Sight", category: "class_buff", cooldownSec: 0, durationSec: 0 },
    { id: "showdown", name: "Showdown", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.6 },
    { id: "quad-star", name: "Quad Star", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.78 },
    { id: "triple-throw", name: "Triple Throw", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.72 },
    { id: "epic-adventure", name: "Epic Adventure", category: "fifth", cooldownSec: 120, durationSec: 60 },
    { id: "will-of-erda", name: "Will of Erda", category: "fifth", cooldownSec: 480, durationSec: 30 },
    { id: "shadow-walker", name: "Shadow Walker", category: "fifth", cooldownSec: 60, durationSec: 30 },
    { id: "domain", name: "Domain of the Dark Lord", category: "fifth", cooldownSec: 120, durationSec: 20 },
    ...hexaSkills("NightLord", [
      "Quad Star", "Assassin's Mark", "Dark Flare", "Sudden Raid",
      "Throwing Star Barrage", "Shurrikane", "Dark Lord's Omen", "Throw Blasting",
      "Life and Death", "Crucial Assault", null, null, "Sol Janus", "Sol Hecate",
    ]),
  ],
};

const BS = {
  charType: "bs",
  patchNote: "GMS wiki-seeded — verify cooldowns/durations",
  skills: [
    { id: "bless", name: "Bless", category: "class_buff", cooldownSec: 0, durationSec: 0 },
    { id: "holy-symbol", name: "Holy Symbol", category: "class_buff", cooldownSec: 0, durationSec: 0 },
    { id: "infinity", name: "Infinity", category: "class_buff", cooldownSec: 180, durationSec: 40 },
    { id: "big-bang", name: "Big Bang", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.9 },
    { id: "angel-ray", name: "Angel Ray", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.84 },
    { id: "genesis", name: "Genesis", category: "fifth", cooldownSec: 360, durationSec: 30 },
    { id: "benediction", name: "Benediction", category: "fifth", cooldownSec: 120, durationSec: 40 },
    { id: "peacemaker", name: "Peacemaker", category: "fifth", cooldownSec: 120, durationSec: 12 },
    { id: "epic-adventure", name: "Epic Adventure", category: "fifth", cooldownSec: 120, durationSec: 60 },
    ...hexaSkills("Bishop", [
      "Angel Ray", "Big Bang", "Angelic Wrath", "Genesis",
      "Benediction", "Angel of Balance", "Peacemaker", "Divine Punishment",
      "Holy Advent", "Command of Heaven", null, null, "Sol Janus", "Sol Hecate",
    ]),
  ],
};

const HERO = {
  charType: "hero",
  patchNote: "GMS wiki-seeded — verify cooldowns/durations",
  skills: [
    { id: "rage", name: "Rage", category: "class_buff", cooldownSec: 0, durationSec: 0 },
    { id: "maple-warrior", name: "Maple Warrior", category: "class_buff", cooldownSec: 0, durationSec: 0 },
    { id: "weapon-aura", name: "Weapon Aura", category: "class_buff", cooldownSec: 180, durationSec: 210 },
    { id: "raging-blow", name: "Raging Blow", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.72 },
    { id: "rising-rage", name: "Rising Rage", category: "attack", cooldownSec: 0, durationSec: 0, delaySec: 0.6 },
    { id: "worldreaver", name: "Worldreaver", category: "fifth", cooldownSec: 360, durationSec: 30 },
    { id: "sword-illusion", name: "Sword Illusion", category: "fifth", cooldownSec: 120, durationSec: 20 },
    { id: "instinctual-combo", name: "Instinctual Combo", category: "fifth", cooldownSec: 120, durationSec: 15 },
    { id: "epic-adventure", name: "Epic Adventure", category: "fifth", cooldownSec: 120, durationSec: 60 },
    ...hexaSkills("Hero", [
      "Raging Blow", "Rising Rage", "Beam Blade", "Cry Valhalla",
      "Burning Soul Blade", "Instinctual Combo", "Worldreaver", "Sword Illusion",
      "Spirit Calibur", "Silent Cleave", null, null, "Sol Janus", "Sol Hecate",
    ]),
  ],
};

const FULL = { nl: NL, bs: BS, hero: HERO };

fs.mkdirSync(dataDir, { recursive: true });

for (const ct of CHAR_TYPES) {
  const payload = FULL[ct] ?? { charType: ct, patchNote: "Skeleton — add skills", skills: [] };
  fs.writeFileSync(
    path.join(dataDir, `${ct}.json`),
    JSON.stringify(payload, null, 2) + "\n",
  );
}

const imports = CHAR_TYPES.map((ct) => `import ${ct.replace(/-/g, "_")}Data from "./data/${ct}.json";`).join("\n");
const entries = CHAR_TYPES.map((ct) => {
  const varName = `${ct.replace(/-/g, "_")}Data`;
  return `  ${JSON.stringify(ct)}: ${varName} as RotationClassData,`;
}).join("\n");

const registry = `import type { RotationClassData } from "./types";

${imports}

export const ROTATION_CLASS_DATA: Record<string, RotationClassData> = {
${entries}
};

export function getRotationClassData(charType: string): RotationClassData {
  return (
    ROTATION_CLASS_DATA[charType] ?? {
      charType,
      patchNote: "Unknown class",
      skills: [],
    }
  );
}
`;

fs.writeFileSync(path.join(root, "src/lib/rotations/class-data.ts"), registry);
console.log(`Wrote ${CHAR_TYPES.length} JSON files + class-data.ts`);
