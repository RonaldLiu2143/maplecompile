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

export type BossHoverInfo = {
  crystalMeso: number;
  hp: { phases: BossHpPhase[]; totalHp: number } | null;
  drops: BossDropInfo[];
};

const BOSSES = data.bosses as Record<string, BossHoverInfo>;

export const BOSS_CRYSTAL_ICON = data.crystalIcon as string;

export function getBossHoverInfo(imgKey: string): BossHoverInfo | null {
  return BOSSES[imgKey] ?? null;
}

export function formatBossHp(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}

export function formatCrystalMeso(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}
