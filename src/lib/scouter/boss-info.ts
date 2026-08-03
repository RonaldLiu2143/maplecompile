import data from "./boss-info-data.json";

export type BossDropInfo = {
  name: string;
  amount: number;
  personal: boolean;
  img: string | null;
};

export type BossHpPhase = {
  label: string;
  entities: number[];
  total: number;
};

export type BossHpBlock = {
  phases: BossHpPhase[];
  totalHp: number;
};

export type BossHoverInfo = {
  crystalMeso: number;
  hp: BossHpBlock | null;
  drops: BossDropInfo[];
};

/** 20 min → KMS (MapleScouter); 30 min → GMS wiki. */
export type BossHpRegion = "kms" | "gms";

type BossInfoRecord = {
  crystalMeso: number;
  /** GMS wiki HP */
  hp: BossHpBlock | null;
  /** MapleScouter / KMS HP */
  hpKms?: BossHpBlock | null;
  drops: BossDropInfo[];
};

const BOSSES = data.bosses as Record<string, BossInfoRecord>;

export const BOSS_CRYSTAL_ICON = data.crystalIcon as string;

export function getBossHoverInfo(
  imgKey: string,
  region: BossHpRegion = "gms",
): BossHoverInfo | null {
  const raw = BOSSES[imgKey];
  if (!raw) return null;
  const hp =
    region === "kms" ? (raw.hpKms ?? raw.hp ?? null) : (raw.hp ?? null);
  return {
    crystalMeso: raw.crystalMeso,
    hp,
    drops: raw.drops,
  };
}

export function getBossRegionHpTotals(imgKey: string): {
  kms: number;
  gms: number;
} {
  const raw = BOSSES[imgKey];
  return {
    kms: raw?.hpKms?.totalHp ?? 0,
    gms: raw?.hp?.totalHp ?? 0,
  };
}

export function formatBossHp(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e15) {
    const q = n / 1e15;
    return `${q >= 100 ? q.toFixed(0) : q >= 10 ? q.toFixed(1) : q.toFixed(2)}Q`;
  }
  if (abs >= 1e12) {
    const t = n / 1e12;
    return `${t >= 100 ? t.toFixed(0) : t >= 10 ? t.toFixed(1) : t.toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    const b = n / 1e9;
    return `${b >= 100 ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2)}B`;
  }
  return Math.round(n).toLocaleString();
}

export function formatCrystalMeso(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}
