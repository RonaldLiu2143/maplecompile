import { resolveMainSecondary } from "./calc";
import type { ScouterInput, StatKey, StatTriple } from "./types";

const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "Max HP",
};

export type MissingScouterField = {
  /** Matches `data-scouter-field` on the form control. */
  id: string;
  label: string;
};

/** Onboarding gate vs calculate / share / pair required set. */
export type ScouterRequiredMode = "basics" | "full";

function tripleFilled(t: StatTriple | undefined | null): boolean {
  if (!t) return false;
  return t.base > 0 || t.flat > 0 || t.percent > 0;
}

function tripleEmpty(t: StatTriple): boolean {
  return !tripleFilled(t);
}

/**
 * Required character-window fields.
 *
 * - `basics`: main (any), sub (any if present), and ATT/MATT — DA/Xenon rules
 *   match onboarding (`hasScouterBasics`). Xenon needs any of STR/DEX/LUK.
 * - `full`: all primary/secondary stats for the job, ATT/MATT, plus damage
 *   window fields used before calculate / public share / pair / boss-clear.
 */
export function getMissingRequiredScouterFields(
  input: ScouterInput,
  mode: ScouterRequiredMode = "full",
): MissingScouterField[] {
  const missing: MissingScouterField[] = [];
  const { mainKeys, secondaryKeys, isXenon, isDa } =
    resolveMainSecondary(input);

  const pushStat = (key: StatKey) => {
    if (tripleEmpty(input.stats[key])) {
      missing.push({ id: `stat-${key}`, label: STAT_LABELS[key] });
    }
  };

  if (isDa) {
    pushStat("hp");
    pushStat("str");
  } else if (isXenon) {
    if (mode === "basics") {
      if (
        !tripleFilled(input.stats.str) &&
        !tripleFilled(input.stats.dex) &&
        !tripleFilled(input.stats.luk)
      ) {
        missing.push({ id: "stat-str", label: "STR / DEX / LUK" });
      }
    } else {
      pushStat("str");
      pushStat("dex");
      pushStat("luk");
    }
  } else if (mode === "basics") {
    if (!mainKeys.some((k) => tripleFilled(input.stats[k]))) {
      const key = mainKeys[0];
      if (key) {
        missing.push({ id: `stat-${key}`, label: STAT_LABELS[key] });
      }
    }
    if (
      secondaryKeys.length > 0 &&
      !secondaryKeys.some((k) => tripleFilled(input.stats[k]))
    ) {
      const key = secondaryKeys[0]!;
      missing.push({ id: `stat-${key}`, label: STAT_LABELS[key] });
    }
  } else {
    for (const key of mainKeys) pushStat(key);
    for (const key of secondaryKeys) pushStat(key);
  }

  if (input.useMagicAttack) {
    if (tripleEmpty(input.magicAttack)) {
      missing.push({ id: "matt", label: "Magic Att" });
    }
  } else if (tripleEmpty(input.attack)) {
    missing.push({ id: "att", label: "Attack" });
  }

  if (mode === "full") {
    if (!input.damagePercent) {
      missing.push({ id: "damage", label: "Damage" });
    }
    if (!input.bossDamagePercent) {
      missing.push({ id: "boss-damage", label: "Boss Damage" });
    }
    if (!input.criticalRatePercent) {
      missing.push({ id: "crit-rate", label: "Critical Rate" });
    }
    if (!input.criticalDamagePercent) {
      missing.push({ id: "crit-damage", label: "Critical Damage" });
    }
    if (!input.ignoreDefensePercent) {
      missing.push({ id: "ied", label: "Ignore Defense" });
    }
  }

  return missing;
}

/** Focus the first matching scouter field control, if present. */
export function focusScouterField(fieldId: string): void {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(
    `[data-scouter-field="${fieldId}"]`,
  );
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
}
