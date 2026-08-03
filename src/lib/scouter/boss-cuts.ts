/** MapleScouter GMS Boss Clear (Cut) standards (`e_` list) + clear-rate math. */

import { getBossRegionHpTotals } from "./boss-info";

/** Supported fight windows for burst/ascent adjust (MapleScouter uses 20). */
export type BossClearFightMinutes = 20 | 30;
export const BOSS_CLEAR_FIGHT_MINUTES_DEFAULT: BossClearFightMinutes = 20;

/** MapleScouter cut calibration baseline. */
const MS_CLEAR_BASE_MINUTES = 20;

export type BossCutDifficulty =
  | "Easy"
  | "Normal"
  | "Hard"
  | "Chaos"
  | "Extreme"
  | "Destiny"
  | "Champion";

export type BossCutEntry = {
  id: string;
  nameEn: string;
  nameKo: string;
  difficulty: BossCutDifficulty;
  bossCut: number | null;
  partyBossCut: number | null;
  easyRate: number;
  newbieCut: number;
  guard: number;
  level: number;
  partyLimit: number;
  arcaneForce: number;
  authenticForce: number;
  imgKey: string;
};

export const BOSS_ICON_CDN = "https://maplescouter.com/bossIcon";

export const BOSS_CUTS: BossCutEntry[] =
[
  {
    "id": "jupiter",
    "nameEn": "Jupiter",
    "nameKo": "유피테르",
    "difficulty": "Hard",
    "bossCut": null,
    "partyBossCut": 125600,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 295,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 810,
    "imgKey": "hard_jupiter"
  },
  {
    "id": "kaling",
    "nameEn": "Kaling",
    "nameKo": "카링",
    "difficulty": "Extreme",
    "bossCut": null,
    "partyBossCut": 108350,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 480,
    "imgKey": "extreme_kaling"
  },
  {
    "id": "adversary",
    "nameEn": "First Adversary",
    "nameKo": "대적자",
    "difficulty": "Extreme",
    "bossCut": null,
    "partyBossCut": 113000,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 290,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 460,
    "imgKey": "extreme_adversary"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Extreme",
    "bossCut": null,
    "partyBossCut": 82750,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 440,
    "imgKey": "extreme_kalos"
  },
  {
    "id": "bardrix",
    "nameEn": "Baldrix",
    "nameKo": "발드릭스",
    "difficulty": "Destiny",
    "bossCut": 132800,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 290,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 700,
    "imgKey": "destiny_bardrix"
  },
  {
    "id": "bardrix",
    "nameEn": "Baldrix",
    "nameKo": "발드릭스",
    "difficulty": "Hard",
    "bossCut": 132800,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 290,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 700,
    "imgKey": "hard_bardrix"
  },
  {
    "id": "maleficStar",
    "nameEn": "Malefic Stars",
    "nameKo": "흉성",
    "difficulty": "Hard",
    "bossCut": 120500,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 550,
    "imgKey": "hard_maleficStar"
  },
  {
    "id": "limbo",
    "nameEn": "Limbo",
    "nameKo": "림보",
    "difficulty": "Destiny",
    "bossCut": 121400,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 500,
    "imgKey": "destiny_limbo"
  },
  {
    "id": "limbo",
    "nameEn": "Limbo",
    "nameKo": "림보",
    "difficulty": "Hard",
    "bossCut": 121400,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 500,
    "imgKey": "hard_limbo"
  },
  {
    "id": "jupiter",
    "nameEn": "Jupiter",
    "nameKo": "유피테르",
    "difficulty": "Normal",
    "bossCut": 112800,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 295,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 810,
    "imgKey": "normal_jupiter"
  },
  {
    "id": "adversary",
    "nameEn": "First Adversary",
    "nameKo": "대적자",
    "difficulty": "Destiny",
    "bossCut": 110200,
    "partyBossCut": null,
    "easyRate": 0.744192,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 340,
    "imgKey": "destiny_adversary"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Extreme",
    "bossCut": 112000,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "extreme_seren"
  },
  {
    "id": "adversary",
    "nameEn": "First Adversary",
    "nameKo": "대적자",
    "difficulty": "Hard",
    "bossCut": 110200,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 340,
    "imgKey": "hard_adversary"
  },
  {
    "id": "kaling",
    "nameEn": "Kaling",
    "nameKo": "카링",
    "difficulty": "Hard",
    "bossCut": 109300,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 350,
    "imgKey": "hard_kaling"
  },
  {
    "id": "bardrix",
    "nameEn": "Baldrix",
    "nameKo": "발드릭스",
    "difficulty": "Normal",
    "bossCut": 108400,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 290,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 700,
    "imgKey": "normal_bardrix"
  },
  {
    "id": "blackMage",
    "nameEn": "Black Mage",
    "nameKo": "검은 마법사",
    "difficulty": "Extreme",
    "bossCut": 101300,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 300,
    "level": 280,
    "partyLimit": 6,
    "arcaneForce": 1320,
    "authenticForce": 0,
    "imgKey": "extreme_blackMage"
  },
  {
    "id": "kaling",
    "nameEn": "Kaling",
    "nameKo": "카링",
    "difficulty": "Destiny",
    "bossCut": 109300,
    "partyBossCut": null,
    "easyRate": 1.116288,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 350,
    "imgKey": "destiny_kaling"
  },
  {
    "id": "limbo",
    "nameEn": "Limbo",
    "nameKo": "림보",
    "difficulty": "Normal",
    "bossCut": 99300,
    "partyBossCut": null,
    "easyRate": 0.885942857142857,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 500,
    "imgKey": "normal_limbo"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Destiny",
    "bossCut": 95100,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 330,
    "imgKey": "destiny_kalos"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Chaos",
    "bossCut": 95100,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 330,
    "imgKey": "chaos_kalos"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Destiny",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 380,
    "level": 275,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "destiny_seren"
  },
  {
    "id": "kaling",
    "nameEn": "Kaling",
    "nameKo": "카링",
    "difficulty": "Normal",
    "bossCut": 73300,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 330,
    "imgKey": "normal_kaling"
  },
  {
    "id": "maleficStar",
    "nameEn": "Malefic Stars",
    "nameKo": "흉성",
    "difficulty": "Normal",
    "bossCut": 72300,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 400,
    "imgKey": "normal_maleficStar"
  },
  {
    "id": "lotus",
    "nameEn": "Lotus",
    "nameKo": "스우",
    "difficulty": "Extreme",
    "bossCut": 66800,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 2,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "extreme_lotus"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Champion",
    "bossCut": 49800,
    "partyBossCut": null,
    "easyRate": 0.6415448275862069,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 300,
    "imgKey": "champion_kalos"
  },
  {
    "id": "adversary",
    "nameEn": "First Adversary",
    "nameKo": "대적자",
    "difficulty": "Normal",
    "bossCut": 55550,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 320,
    "imgKey": "normal_adversary"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Normal",
    "bossCut": 49800,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 300,
    "imgKey": "normal_kalos"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Champion",
    "bossCut": 44300,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 275,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "champion_seren"
  },
  {
    "id": "kaling",
    "nameEn": "Kaling",
    "nameKo": "카링",
    "difficulty": "Easy",
    "bossCut": 42000,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 275,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 230,
    "imgKey": "easy_kaling"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 380,
    "level": 275,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "hard_seren"
  },
  {
    "id": "adversary",
    "nameEn": "First Adversary",
    "nameKo": "대적자",
    "difficulty": "Easy",
    "bossCut": 35250,
    "partyBossCut": null,
    "easyRate": 0.93024,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 220,
    "imgKey": "easy_adversary"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Easy",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "easy_kalos"
  },
  {
    "id": "blackMage",
    "nameEn": "Black Mage",
    "nameKo": "검은 마법사",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.07712,
    "newbieCut": 100,
    "guard": 300,
    "level": 275,
    "partyLimit": 6,
    "arcaneForce": 1320,
    "authenticForce": 0,
    "imgKey": "hard_blackMage"
  },
  {
    "id": "blackMage",
    "nameEn": "Black Mage",
    "nameKo": "검은 마법사",
    "difficulty": "Champion",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.07712,
    "newbieCut": 100,
    "guard": 300,
    "level": 275,
    "partyLimit": 1,
    "arcaneForce": 1320,
    "authenticForce": 0,
    "imgKey": "champion_blackMage"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "normal_seren"
  },
  {
    "id": "verusHilla",
    "nameEn": "Verus Hilla",
    "nameKo": "진 힐라",
    "difficulty": "Champion",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.96,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 1,
    "arcaneForce": 900,
    "authenticForce": 0,
    "imgKey": "champion_verusHilla"
  },
  {
    "id": "verusHilla",
    "nameEn": "Verus Hilla",
    "nameKo": "진 힐라",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 6,
    "arcaneForce": 900,
    "authenticForce": 0,
    "imgKey": "hard_verusHilla"
  },
  {
    "id": "kai",
    "nameEn": "Kai",
    "nameKo": "카이",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.02,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "hard_kai"
  },
  {
    "id": "kai",
    "nameEn": "Kai",
    "nameKo": "카이",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.02,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_kai"
  },
  {
    "id": "darknell",
    "nameEn": "Darknell",
    "nameKo": "듄켈",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 265,
    "partyLimit": 6,
    "arcaneForce": 850,
    "authenticForce": 0,
    "imgKey": "hard_darknell"
  },
  {
    "id": "gloom",
    "nameEn": "Gloom",
    "nameKo": "더스크",
    "difficulty": "Chaos",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 255,
    "partyLimit": 6,
    "arcaneForce": 730,
    "authenticForce": 0,
    "imgKey": "chaos_gloom"
  },
  {
    "id": "slime",
    "nameEn": "Guardian Slime",
    "nameKo": "가엔슬",
    "difficulty": "Chaos",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_slime"
  },
  {
    "id": "will",
    "nameEn": "Will",
    "nameKo": "윌",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 6,
    "arcaneForce": 760,
    "authenticForce": 0,
    "imgKey": "hard_will"
  },
  {
    "id": "lucid",
    "nameEn": "Lucid",
    "nameKo": "루시드",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 230,
    "partyLimit": 6,
    "arcaneForce": 360,
    "authenticForce": 0,
    "imgKey": "hard_lucid"
  },
  {
    "id": "verusHilla",
    "nameEn": "Verus Hilla",
    "nameKo": "진 힐라",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 6,
    "arcaneForce": 820,
    "authenticForce": 0,
    "imgKey": "normal_verusHilla"
  },
  {
    "id": "lotus",
    "nameEn": "Lotus",
    "nameKo": "스우",
    "difficulty": "Champion",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.96,
    "newbieCut": 100,
    "guard": 300,
    "level": 210,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "champion_lotus"
  },
  {
    "id": "damien",
    "nameEn": "Damien",
    "nameKo": "데미안",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 210,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "hard_damien"
  },
  {
    "id": "lotus",
    "nameEn": "Lotus",
    "nameKo": "스우",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 210,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "hard_lotus"
  },
  {
    "id": "darknell",
    "nameEn": "Darknell",
    "nameKo": "듄켈",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 265,
    "partyLimit": 6,
    "arcaneForce": 850,
    "authenticForce": 0,
    "imgKey": "normal_darknell"
  },
  {
    "id": "gloom",
    "nameEn": "Gloom",
    "nameKo": "더스크",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 255,
    "partyLimit": 6,
    "arcaneForce": 730,
    "authenticForce": 0,
    "imgKey": "normal_gloom"
  },
  {
    "id": "lucid",
    "nameEn": "Lucid",
    "nameKo": "루시드",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 230,
    "partyLimit": 6,
    "arcaneForce": 360,
    "authenticForce": 0,
    "imgKey": "normal_lucid"
  },
  {
    "id": "will",
    "nameEn": "Will",
    "nameKo": "윌",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 6,
    "arcaneForce": 760,
    "authenticForce": 0,
    "imgKey": "normal_will"
  },
  {
    "id": "will",
    "nameEn": "Will",
    "nameKo": "윌",
    "difficulty": "Easy",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 235,
    "partyLimit": 6,
    "arcaneForce": 560,
    "authenticForce": 0,
    "imgKey": "easy_will"
  },
  {
    "id": "lucid",
    "nameEn": "Lucid",
    "nameKo": "루시드",
    "difficulty": "Easy",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 230,
    "partyLimit": 6,
    "arcaneForce": 360,
    "authenticForce": 0,
    "imgKey": "easy_lucid"
  },
  {
    "id": "slime",
    "nameEn": "Guardian Slime",
    "nameKo": "가엔슬",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 220,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_slime"
  },
  {
    "id": "lotus",
    "nameEn": "Lotus",
    "nameKo": "스우",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 210,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_lotus"
  },
  {
    "id": "damien",
    "nameEn": "Damien",
    "nameKo": "데미안",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.9792,
    "newbieCut": 100,
    "guard": 300,
    "level": 210,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_damien"
  }
] as BossCutEntry[];


export type Spline = { x: number[]; y: number[]; m: number[] };

/** Hermite spline: converted-stat → expected damage (MapleScouter M8). */
export function splineDamage(spline: Spline, stat: number): number {
  const { x, y, m } = spline;
  const n = x.length;
  if (n === 0) return 0;
  if (stat < x[0]!) return y[0]! + (stat - x[0]!) * m[0]!;
  if (stat <= x[n - 1]!) {
    let a = n - 2;
    for (let i = 0; i < n - 1; i++) {
      if (stat >= x[i]! && stat <= x[i + 1]!) {
        a = i;
        break;
      }
    }
    const h = x[a + 1]! - x[a]!;
    const t = (stat - x[a]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * y[a]! +
      (t3 - 2 * t2 + t) * h * m[a]! +
      (-2 * t3 + 3 * t2) * y[a + 1]! +
      (t3 - t2) * h * m[a + 1]!
    );
  }
  const last = x[n - 1]!;
  return y[n - 1]! + (stat - last) * Math.max(m[n - 1]!, 1e-9);
}

/** Inverse spline: expected damage → converted-stat (MapleScouter mg). */
export function splineStat(spline: Spline, damage: number, iters = 40): number {
  const { x, y, m } = spline;
  const n = x.length;
  if (n === 0) return 0;
  if (damage <= y[0]!) {
    const slope = Math.max(m[0]!, 1e-9);
    return Math.round(x[0]! + (damage - y[0]!) / slope);
  }
  if (damage >= y[n - 1]!) {
    const last = x[n - 1]!;
    return Math.round(last + (damage - y[n - 1]!) / Math.max(m[n - 1]!, 1e-9));
  }
  let lo = x[0]!;
  let hi = x[n - 1]!;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (splineDamage(spline, mid) < damage) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

const LEVEL_GAP: Record<string, number> = {
  "5": 120,
  "4": 118,
  "3": 116,
  "2": 114,
  "1": 112,
  "0": 110,
  "-1": 105.3,
  "-2": 100.7,
  "-3": 96.2,
  "-4": 91.8,
  "-5": 87.5,
  "-6": 85,
  "-7": 82.5,
  "-8": 80,
  "-9": 77.5,
  "-10": 75,
  "-11": 72.5,
  "-12": 70,
  "-13": 67.5,
  "-14": 65,
  "-15": 62.5,
  "-16": 60,
  "-17": 57.5,
  "-18": 55,
  "-19": 52.5,
  "-20": 50,
  "-21": 47.5,
  "-22": 45,
  "-23": 42.5,
  "-24": 40,
  "-25": 37.5,
  "-26": 35,
  "-27": 32.5,
  "-28": 30,
  "-29": 27.5,
  "-30": 25,
  "-31": 22.5,
  "-32": 20,
  "-33": 17.5,
  "-34": 15,
  "-35": 12.5,
  "-36": 10,
  "-37": 7.5,
  "-38": 5,
  "-39": 2.5,
  "-40": 0,
};

function arcaneGapMult(bossArcane: number, userArcane: number): number {
  if (bossArcane <= 0) return 1;
  const pct = (userArcane / bossArcane) * 100;
  const raw =
    pct < 10
      ? 10
      : pct < 30
        ? 30
        : pct < 50
          ? 60
          : pct < 70
            ? 70
            : pct < 100
              ? 80
              : pct < 110
                ? 100
                : pct < 130
                  ? 110
                  : pct < 150
                    ? 130
                    : 150;
  return raw / 100;
}

function authenticGapMult(bossAuth: number, userAuth: number): number {
  if (bossAuth <= 0) return 1;
  const d = userAuth - bossAuth;
  const raw =
    d < -90
      ? 5
      : d < -80
        ? 10
        : d < -70
          ? 20
          : d < -60
            ? 30
            : d < -50
              ? 40
              : d < -40
                ? 50
                : d < -30
                  ? 60
                  : d < -20
                    ? 70
                    : d < -10
                      ? 80
                      : d < 0
                        ? 90
                        : d < 10
                          ? 100
                          : d < 20
                            ? 105
                            : d < 30
                              ? 110
                              : d < 40
                                ? 115
                                : d < 50
                                  ? 120
                                  : 125;
  return raw / 100;
}

function levelGapMult(userLevel: number, bossLevel: number): number {
  if (!bossLevel) return 1;
  let diff = Math.floor(userLevel) - bossLevel;
  if (diff > 5) diff = 5;
  if (diff < -40) diff = -40;
  return (LEVEL_GAP[String(diff)] ?? 100) / 100;
}

function forceDenom(entry: BossCutEntry): number {
  let f = 1;
  if (entry.arcaneForce > 0) {
    f = entry.id === "blackMage" ? 1.1 : 1.5;
  }
  return 1.2 * f * (entry.authenticForce > 0 ? 1.25 : 1);
}

export type BossClearLabel =
  | "Easy"
  | "Possible"
  | "Solo Min"
  | "Party-able"
  | "Party Min"
  | "Can't Enter"
  | "2p Min Cut"
  | "3p Min Cut"
  | "4p Min Cut"
  | "6p Min Cut"
  | "[Newbie] Easy"
  | "[Newbie] Solo"
  | "[Newbie] 2p"
  | "[Newbie] 4p"
  | "[Newbie] 6p"
  | "Impossible";

const LABEL_EN: Record<string, BossClearLabel> = {
  "솔플 여유컷": "Easy",
  "솔플 가능": "Possible",
  "솔플 최소컷": "Solo Min",
  "파티격 가능": "Party-able",
  "파티 최소컷": "Party Min",
  "불가능": "Can't Enter",
  "2인 최소컷": "2p Min Cut",
  "3인 최소컷": "3p Min Cut",
  "4인 최소컷": "4p Min Cut",
  "6인 최소컷": "6p Min Cut",
  "[뉴비] 여유컷": "[Newbie] Easy",
  "[뉴비] 솔플": "[Newbie] Solo",
  "[뉴비] 2인": "[Newbie] 2p",
  "[뉴비] 4인": "[Newbie] 4p",
  "[뉴비] 6인": "[Newbie] 6p",
};

export function bossClearLabelKo(
  clearRate: number,
  isPartyBoss: boolean,
  partyLimit: number,
  newbieMode = false,
  newbieCut = 100,
): string {
  if (newbieMode && newbieCut > 100) {
    const n = newbieCut / 100;
    if (!isPartyBoss && partyLimit === 6) {
      if (clearRate >= 5) return "[뉴비] 여유컷";
      if (clearRate >= n) return "[뉴비] 솔플";
      if (clearRate >= 0.5 * n) return "[뉴비] 2인";
      if (clearRate >= 0.25 * n) return "[뉴비] 4인";
      if (clearRate >= 0.15 * n) return "[뉴비] 6인";
      return "불가능";
    }
  }
  if (isPartyBoss) {
    if (partyLimit === 3) {
      if (clearRate >= 2.7) return "솔플 최소컷";
      if (clearRate >= 1.35) return "2인 최소컷";
      if (clearRate >= 0.9) return "3인 최소컷";
      return "불가능";
    }
    if (clearRate >= 5.1) return "솔플 최소컷";
    if (clearRate >= 2.55) return "2인 최소컷";
    if (clearRate >= 1.7) return "3인 최소컷";
    if (clearRate >= 1.275) return "4인 최소컷";
    if (clearRate >= 0.9) return "6인 최소컷";
    return "불가능";
  }
  if (partyLimit === 6) {
    if (clearRate >= 2) return "솔플 여유컷";
    if (clearRate >= 1.1) return "솔플 가능";
    if (clearRate >= 0.9) return "솔플 최소컷";
    if (clearRate >= 0.25) return "파티격 가능";
    if (clearRate >= 0.15) return "파티 최소컷";
    return "불가능";
  }
  if (partyLimit === 3) {
    if (clearRate >= 2) return "솔플 여유컷";
    if (clearRate >= 1.1) return "솔플 가능";
    if (clearRate >= 0.9) return "솔플 최소컷";
    if (clearRate >= 0.36) return "파티격 가능";
    if (clearRate >= 0.3) return "파티 최소컷";
    return "불가능";
  }
  if (partyLimit === 2) {
    if (clearRate >= 2) return "솔플 여유컷";
    if (clearRate >= 1.1) return "솔플 가능";
    if (clearRate >= 0.9) return "솔플 최소컷";
    if (clearRate >= 0.55) return "파티격 가능";
    if (clearRate >= 0.45) return "파티 최소컷";
    return "불가능";
  }
  if (partyLimit === 1) {
    if (clearRate >= 2) return "솔플 여유컷";
    if (clearRate >= 1.1) return "솔플 가능";
    if (clearRate >= 0.9) return "솔플 최소컷";
  }
  return "불가능";
}

export function bossClearLabelEn(
  clearRate: number,
  isPartyBoss: boolean,
  partyLimit: number,
  newbieMode = false,
  newbieCut = 100,
): BossClearLabel {
  const ko = bossClearLabelKo(
    clearRate,
    isPartyBoss,
    partyLimit,
    newbieMode,
    newbieCut,
  );
  return LABEL_EN[ko] ?? "Can't Enter";
}

export type BossClearRow = BossCutEntry & {
  cut: number;
  isPartyBoss: boolean;
  userStat: number;
  clearRate: number;
  clearPercent: number;
  label: BossClearLabel;
  imgUrl: string;
  cantEnter: boolean;
  /** Index in MapleScouter GMS difficulty order. */
  rank: number;
};

export type BossClearCalcInput = {
  level: number;
  arcaneForce: number;
  authenticForce: number;
  /** HEXA expected damage at 300% PDR */
  damage300: number;
  /** HEXA expected damage at 380% PDR */
  damage380: number;
  boss300Stat: number;
  boss380Stat: number;
  spline300?: Spline | null;
  spline380?: Spline | null;
  /** ascent_const from CALC_DMG (timer adjust). */
  ascentConst?: number;
  /** Fight window for burst/ascent adjust (default 20). */
  fightMinutes?: BossClearFightMinutes;
  relevantOnly?: boolean;
  newbieMode?: boolean;
};

/**
 * MapleScouter clearRate (cut/spline), then region HP + fight-time scale:
 *   z0 = I/E * easyRate          (calibrated to KMS HP @ 20 min)
 *   z  = z0 * (kmsHp / targetHp) * (fightMinutes / 20)
 *        targetHp = KMS when 20 min, GMS when 30 min
 *   O  = z * (1 + timerAdjust(ascentConst, fightMinutes))
 *
 * Note: never divide raw CALC_DMG damage by wiki HP directly — different units.
 */
export function evaluateBossClears(args: BossClearCalcInput): BossClearRow[] {
  const {
    level,
    arcaneForce,
    authenticForce,
    damage300,
    damage380,
    boss300Stat,
    boss380Stat,
    spline300,
    spline380,
    ascentConst = 0,
    fightMinutes = BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
    relevantOnly = true,
    newbieMode = false,
  } = args;

  const rows: BossClearRow[] = BOSS_CUTS.map((entry, rank) => {
    const isPartyBoss = entry.partyBossCut != null;
    const cut = (entry.bossCut ?? entry.partyBossCut) || 0;
    const dmg = entry.guard === 380 ? damage380 : damage300;
    const fallbackStat = entry.guard === 380 ? boss380Stat : boss300Stat;
    const spline = entry.guard === 380 ? spline380 : spline300;

    const aGap = arcaneGapMult(entry.arcaneForce, arcaneForce);
    const sGap = authenticGapMult(entry.authenticForce, authenticForce);
    const lGap = levelGapMult(level, entry.level);
    const denom = forceDenom(entry);
    const L = 1; // elixir mode 3 (default MS) → L === 1
    let R = ascentConst;
    if (R === 1) R = 0;

    const I = (dmg * aGap * sGap * lGap) / denom;
    let clearRate = 0;
    let userStat = fallbackStat;

    const { kms: kmsHp, gms: gmsHp } = getBossRegionHpTotals(entry.imgKey);
    const targetHp = fightMinutes === 30 ? gmsHp : kmsHp;
    const regionScale =
      kmsHp > 0 && targetHp > 0
        ? (kmsHp / targetHp) * (fightMinutes / MS_CLEAR_BASE_MINUTES)
        : fightMinutes / MS_CLEAR_BASE_MINUTES;

    if (spline && cut > 0 && Array.isArray(spline.x) && spline.x.length > 0) {
      const E = splineDamage(spline, cut);
      userStat = splineStat(spline, I * L);
      if (E > 0) {
        const z0 = (I / (E < 0 ? 1e4 : E)) * (entry.easyRate || 1) * L;
        const z = z0 * regionScale;
        const burstSlots =
          entry.nameKo === "루시드" && entry.difficulty === "Hard"
            ? 0.4
            : Math.min(
                3,
                Math.ceil(fightMinutes / Math.max(z, 1e-9) / 5.667),
              );
        const G = (3 * R) / burstSlots - R || 0;
        clearRate = z * (1 + G) || 0;
      }
    } else if (cut > 0) {
      // No spline: approximate with converted-stat ratio + region scale
      clearRate =
        (fallbackStat / cut) * (entry.easyRate || 1) * regionScale;
      userStat = fallbackStat;
    }

    const forceBlocked =
      (entry.arcaneForce > 0 && arcaneForce + 50 < entry.arcaneForce) ||
      (entry.authenticForce > 0 && authenticForce + 20 < entry.authenticForce);
    const levelBlocked = entry.level > 0 && level + 5 < entry.level;
    const cantEnter = forceBlocked || levelBlocked;

    const label = bossClearLabelEn(
      clearRate,
      isPartyBoss,
      entry.partyLimit,
      newbieMode,
      entry.newbieCut,
    );

    return {
      ...entry,
      cut,
      isPartyBoss,
      userStat,
      clearRate,
      clearPercent: clearRate * 100,
      label,
      imgUrl: `${BOSS_ICON_CDN}/${entry.imgKey}.png`,
      cantEnter,
      rank,
    };
  });

  const filtered = relevantOnly
    ? rows.filter((e) => {
        if (e.isPartyBoss ? e.clearRate / e.partyLimit > 10 : e.clearRate > 10) {
          return false;
        }
        if (e.isPartyBoss) {
          if (e.clearRate < 0.85 / e.partyLimit) return false;
        } else if (e.clearRate < 0.15) {
          return false;
        }
        return true;
      })
    : rows;

  // MapleScouter GMS list order = boss difficulty ranking (hardest first)
  return filtered.sort((a, b) => a.rank - b.rank);
}

/** Difficulty ribbon colors (MapleScouter-style). */
export function difficultyRibbonClass(difficulty: string): string {
  switch (difficulty) {
    case "Extreme":
      return "bg-red-600 text-white";
    case "Destiny":
      return "bg-zinc-900 text-white";
    case "Chaos":
      return "bg-stone-700 text-white";
    case "Hard":
      return "bg-fuchsia-700 text-white";
    case "Champion":
      return "bg-orange-500 text-white";
    case "Normal":
      return "bg-teal-600 text-white";
    case "Easy":
      return "bg-emerald-600 text-white";
    default:
      return "bg-zinc-600 text-white";
  }
}

/** Status pill styles for clear labels. */
export function labelPillClass(label: BossClearLabel): string {
  switch (label) {
    case "Easy":
    case "[Newbie] Easy":
      return "bg-emerald-500 text-white";
    case "Possible":
    case "[Newbie] Solo":
      return "bg-lime-600 text-white";
    case "Solo Min":
      return "bg-zinc-700 text-white";
    case "Party-able":
    case "2p Min Cut":
    case "3p Min Cut":
    case "4p Min Cut":
    case "6p Min Cut":
    case "[Newbie] 2p":
    case "[Newbie] 4p":
    case "[Newbie] 6p":
      return "bg-blue-700 text-white";
    case "Party Min":
      return "bg-indigo-800 text-white";
    case "Can't Enter":
    case "Impossible":
    default:
      return "bg-zinc-800 text-zinc-200";
  }
}

export function labelTone(label: BossClearLabel): string {
  switch (label) {
    case "Easy":
    case "[Newbie] Easy":
      return "text-emerald-600 dark:text-emerald-400";
    case "Possible":
    case "[Newbie] Solo":
      return "text-sky-600 dark:text-sky-400";
    case "Solo Min":
      return "text-amber-600 dark:text-amber-400";
    case "Party-able":
    case "[Newbie] 2p":
    case "[Newbie] 4p":
      return "text-orange-600 dark:text-orange-400";
    case "Party Min":
    case "2p Min Cut":
    case "3p Min Cut":
    case "4p Min Cut":
    case "6p Min Cut":
    case "[Newbie] 6p":
      return "text-rose-600 dark:text-rose-400";
    case "Can't Enter":
    case "Impossible":
    default:
      return "text-zinc-500";
  }
}
