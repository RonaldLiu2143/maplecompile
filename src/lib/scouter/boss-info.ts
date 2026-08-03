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
  return Math.round(n).toLocaleString();
}

export function formatCrystalMeso(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}
