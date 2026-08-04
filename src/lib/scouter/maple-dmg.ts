import { toMapleScouterUserStat } from "./to-user-stat";
import type { BuffState, LinkState } from "./buffs";
import type { ScouterInput } from "./types";
import type { MapleScouterCalculatedData } from "./to-user-stat";

const CALC_DMG_URL = "https://api.maplescouter.com/api/calc/dmg";

export type ScouterCalcState = {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
  /** MapleScouter special.is30min — default false (20 min / KMS). */
  is30min?: boolean;
};

/** Boss Converted Stat HEXA values (MapleScouter CALC_DMG). */
export type BossConvertedHexaStats = {
  boss300HexaStat: number;
  boss380HexaStat: number;
};

export type MapleScouterCalcDmgResponse = {
  calculatedData: MapleScouterCalculatedData;
  calculatedHuntData: Record<string, unknown> | null;
};

export async function fetchMapleScouterCalcDmg(
  args: ScouterCalcState,
): Promise<MapleScouterCalcDmgResponse> {
  const userStat = toMapleScouterUserStat({
    input: args.input,
    buffs: args.buffs,
    links: args.links,
    hexa: args.hexa,
    is30min: args.is30min,
  });
  const upstream = await fetch(CALC_DMG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://maplescouter.com",
      Referer: "https://maplescouter.com/",
      "User-Agent": "Mozilla/5.0 MapleCompile",
    },
    body: JSON.stringify({ userStat }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    throw new Error(
      `MapleScouter CALC_DMG failed (${upstream.status})${
        text ? `: ${text.slice(0, 200)}` : ""
      }`,
    );
  }

  const data = (await upstream.json()) as {
    calculatedData?: MapleScouterCalculatedData | null;
    calculatedHuntData?: Record<string, unknown> | null;
  };
  if (!data.calculatedData) {
    throw new Error("MapleScouter CALC_DMG returned no calculatedData");
  }
  return {
    calculatedData: data.calculatedData,
    calculatedHuntData: data.calculatedHuntData ?? null,
  };
}

export async function fetchMapleScouterCalculatedData(
  args: ScouterCalcState,
): Promise<MapleScouterCalculatedData> {
  const { calculatedData } = await fetchMapleScouterCalcDmg(args);
  return calculatedData;
}

export function bossConvertedHexaFromCalculated(
  data: MapleScouterCalculatedData,
): BossConvertedHexaStats {
  return {
    boss300HexaStat: Number(data.boss300_hexaStat ?? data.boss300_stat ?? 0) || 0,
    boss380HexaStat: Number(data.boss380_hexaStat ?? data.boss380_stat ?? 0) || 0,
  };
}

export async function fetchBossConvertedHexaStats(
  args: ScouterCalcState,
): Promise<BossConvertedHexaStats> {
  const data = await fetchMapleScouterCalculatedData(args);
  return bossConvertedHexaFromCalculated(data);
}

export function normalizeBossConvertedHexaStat(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}
