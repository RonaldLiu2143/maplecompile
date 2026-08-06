import type { ScouterInput, StatKey, StatTriple } from "./types";
import { EMPTY_TRIPLE } from "./types";

export type ScouterOcrPatch = {
  level?: number;
  stats?: Partial<Record<StatKey, StatTriple>>;
  attack?: StatTriple;
  magicAttack?: StatTriple;
  damagePercent?: number;
  bossDamagePercent?: number;
  finalDamagePercent?: number;
  ignoreDefensePercent?: number;
  criticalRatePercent?: number;
  criticalDamagePercent?: number;
  arcaneForce?: number;
  sacredForce?: number;
};

export type ScouterOcrParseResult = {
  patch: ScouterOcrPatch;
  /** Human-readable labels that were filled from the text. */
  matched: string[];
  warnings: string[];
};

function parseNumberToken(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "").replace(/^\+/, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Pull the first plausible number from a line (handles 12,345 / +350% / 92.5%). */
function firstNumber(line: string): number | null {
  const m = line.match(/[+\-]?\d[\d,]*(?:\.\d+)?/);
  return m ? parseNumberToken(m[0]) : null;
}

/** Up to three numbers on a line → base / % / flat. */
function tripleFromLine(line: string): StatTriple | null {
  const nums = [...line.matchAll(/[+\-]?\d[\d,]*(?:\.\d+)?/g)]
    .map((m) => parseNumberToken(m[0]))
    .filter((n): n is number => n != null);
  if (nums.length === 0) return null;
  if (nums.length === 1) return { base: nums[0], percent: 0, flat: 0 };
  if (nums.length === 2) return { base: nums[0], percent: nums[1], flat: 0 };
  return { base: nums[0], percent: nums[1], flat: nums[2] };
}

type LineRule = {
  label: string;
  test: (normalized: string) => boolean;
  apply: (line: string, patch: ScouterOcrPatch, matched: string[]) => void;
};

function setStat(
  patch: ScouterOcrPatch,
  key: StatKey,
  triple: StatTriple,
  matched: string[],
  label: string,
) {
  patch.stats = { ...patch.stats, [key]: triple };
  matched.push(label);
}

function setScalar(
  patch: ScouterOcrPatch,
  key: keyof ScouterOcrPatch,
  value: number,
  matched: string[],
  label: string,
) {
  (patch as Record<string, unknown>)[key] = value;
  matched.push(label);
}

/**
 * Normalize OCR noise: collapse spaces, lowercase for matching.
 * Keep original line for number extraction.
 */
function normalizeLabel(line: string): string {
  return line
    .toLowerCase()
    .replace(/[|:：＝=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STAT_RULES: { key: StatKey; label: string; patterns: RegExp[] }[] = [
  { key: "str", label: "STR", patterns: [/^str\b/, /\bstrength\b/] },
  { key: "dex", label: "DEX", patterns: [/^dex\b/, /\bdexterity\b/] },
  { key: "int", label: "INT", patterns: [/^int\b/, /\bintelligence\b/] },
  { key: "luk", label: "LUK", patterns: [/^luk\b/, /\bluck\b/] },
  {
    key: "hp",
    label: "Max HP",
    patterns: [/^max\s*hp\b/, /^hp\b/, /\bmax\s*hp\b/],
  },
];

const LINE_RULES: LineRule[] = [
  {
    label: "Level",
    test: (n) => /^(lv|lvl|level)\b/.test(n) || /\blevel\b/.test(n),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null && n > 0 && n < 400) {
        setScalar(patch, "level", Math.floor(n), matched, "Level");
      }
    },
  },
  {
    label: "Attack",
    test: (n) =>
      /^(att|attack|attack power|weapon att|atk)\b/.test(n) ||
      /\battack power\b/.test(n) ||
      n === "att" ||
      n.startsWith("att "),
    apply: (line, patch, matched) => {
      // Avoid matching "Attack Power %" style false positives on Magic ATT lines.
      const norm = normalizeLabel(line);
      if (/\bmagic\b|\bm\.?\s*att|\bmatt\b|\b마력\b/.test(norm)) return;
      const t = tripleFromLine(line);
      if (t) {
        patch.attack = t;
        matched.push("Attack");
      }
    },
  },
  {
    label: "Magic Att",
    test: (n) =>
      /^(matt|m\.?\s*att|magic att|magic attack|마력)\b/.test(n) ||
      /\bmagic\s*(att|attack)\b/.test(n),
    apply: (line, patch, matched) => {
      const t = tripleFromLine(line);
      if (t) {
        patch.magicAttack = t;
        matched.push("Magic Att");
      }
    },
  },
  {
    label: "Boss Damage",
    test: (n) =>
      /\bboss\b/.test(n) &&
      (/\bdamage\b/.test(n) || /\bdmg\b/.test(n) || n.includes("보스")),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "bossDamagePercent", n, matched, "Boss Damage");
      }
    },
  },
  {
    label: "Ignore Defense",
    test: (n) =>
      /\bied\b/.test(n) ||
      (/\bignore\b/.test(n) && /\bdef/.test(n)) ||
      /\bignore defense\b/.test(n) ||
      n.includes("방어율 무시"),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "ignoreDefensePercent", n, matched, "Ignore Defense");
      }
    },
  },
  {
    label: "Critical Damage",
    test: (n) =>
      (/\bcrit/.test(n) || /\bcritical\b/.test(n)) &&
      (/\bdamage\b/.test(n) || /\bdmg\b/.test(n) || n.includes("데미지")),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(
          patch,
          "criticalDamagePercent",
          n,
          matched,
          "Critical Damage",
        );
      }
    },
  },
  {
    label: "Critical Rate",
    test: (n) =>
      (/\bcrit/.test(n) || /\bcritical\b/.test(n)) &&
      (/\brate\b/.test(n) || /\bchance\b/.test(n)),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "criticalRatePercent", n, matched, "Critical Rate");
      }
    },
  },
  {
    label: "Damage",
    test: (n) =>
      /^(damage|dmg)\b/.test(n) &&
      !/\bboss\b/.test(n) &&
      !/\bfinal\b/.test(n) &&
      !/\bcrit/.test(n) &&
      !/\bnormal\b/.test(n),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "damagePercent", n, matched, "Damage");
      }
    },
  },
  {
    label: "Final Damage",
    test: (n) => /\bfinal\b/.test(n) && (/\bdamage\b/.test(n) || /\bdmg\b/.test(n)),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "finalDamagePercent", n, matched, "Final Damage");
      }
    },
  },
  {
    label: "Arcane Force",
    test: (n) => /\barcane\b/.test(n) && /\bforce\b/.test(n),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "arcaneForce", Math.floor(n), matched, "Arcane Force");
      }
    },
  },
  {
    label: "Sacred Force",
    test: (n) =>
      (/\bsacred\b/.test(n) || /\bauthentic\b/.test(n)) && /\bforce\b/.test(n),
    apply: (line, patch, matched) => {
      const n = firstNumber(line);
      if (n != null) {
        setScalar(patch, "sacredForce", Math.floor(n), matched, "Sacred Force");
      }
    },
  },
];

/**
 * Parse pasted character-window / OCR text into a scouter field patch.
 *
 * Supported shapes (per line):
 * - `STR 12345` or `STR: 12,345`
 * - `STR 10000 200 500` → base / % / flat
 * - `Boss Damage 350%`, `IED 92`, `Attack Power 5000`
 * - Compact block: `ATT 5000` / `MATT 5000`
 */
export function parseScouterOcrText(text: string): ScouterOcrParseResult {
  const patch: ScouterOcrPatch = {};
  const matched: string[] = [];
  const warnings: string[] = [];

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { patch, matched, warnings: ["Nothing to parse."] };
  }

  for (const line of lines) {
    const norm = normalizeLabel(line);

    let hitStat = false;
    for (const rule of STAT_RULES) {
      if (rule.patterns.some((p) => p.test(norm))) {
        const t = tripleFromLine(line);
        if (t) {
          setStat(patch, rule.key, t, matched, rule.label);
          hitStat = true;
        }
        break;
      }
    }
    if (hitStat) continue;

    for (const rule of LINE_RULES) {
      if (rule.test(norm)) {
        const before = matched.length;
        rule.apply(line, patch, matched);
        if (matched.length > before) break;
      }
    }
  }

  if (matched.length === 0) {
    warnings.push(
      "No recognizable stats found. Try lines like “STR 12345” or “Boss Damage 350%”.",
    );
  }

  return { patch, matched: [...new Set(matched)], warnings };
}

/** Merge an OCR patch into the current scouter input (only filled keys). */
export function applyScouterOcrPatch(
  input: ScouterInput,
  patch: ScouterOcrPatch,
): ScouterInput {
  const next: ScouterInput = {
    ...input,
    stats: { ...input.stats },
  };

  if (patch.level != null) next.level = patch.level;
  if (patch.attack) next.attack = { ...EMPTY_TRIPLE, ...patch.attack };
  if (patch.magicAttack) {
    next.magicAttack = { ...EMPTY_TRIPLE, ...patch.magicAttack };
  }
  if (patch.damagePercent != null) next.damagePercent = patch.damagePercent;
  if (patch.bossDamagePercent != null) {
    next.bossDamagePercent = patch.bossDamagePercent;
  }
  if (patch.finalDamagePercent != null) {
    next.finalDamagePercent = patch.finalDamagePercent;
  }
  if (patch.ignoreDefensePercent != null) {
    next.ignoreDefensePercent = patch.ignoreDefensePercent;
  }
  if (patch.criticalRatePercent != null) {
    next.criticalRatePercent = patch.criticalRatePercent;
  }
  if (patch.criticalDamagePercent != null) {
    next.criticalDamagePercent = patch.criticalDamagePercent;
  }
  if (patch.arcaneForce != null) next.arcaneForce = patch.arcaneForce;
  if (patch.sacredForce != null) next.sacredForce = patch.sacredForce;

  if (patch.stats) {
    for (const key of Object.keys(patch.stats) as StatKey[]) {
      const t = patch.stats[key];
      if (t) next.stats[key] = { ...EMPTY_TRIPLE, ...t };
    }
  }

  return next;
}

export const SCOUTER_OCR_EXAMPLE = `STR 45000 200 500
DEX 5000
Attack Power 12000
Boss Damage 350%
Ignore Defense 92%
Critical Damage 85%
Level 285`;
