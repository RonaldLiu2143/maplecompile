/** MapleScouter Boss Clear (Cut) standards — extracted from their 2026-07 dataset. */

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
  /** Solo / main converted-stat cut (환산). */
  bossCut: number | null;
  /** Party-scaled cut when MapleScouter uses partyBossCut. */
  partyBossCut: number | null;
  easyRate: number;
  newbieCut: number;
  guard: 300 | 380;
  level: number;
  partyLimit: number;
  arcaneForce: number;
  authenticForce: number;
  imgKey: string;
};

export const BOSS_CUTS: BossCutEntry[] = 
[
  {
    "id": "jupiter",
    "nameEn": "Jupiter",
    "nameKo": "유피테르",
    "difficulty": "Hard",
    "bossCut": null,
    "partyBossCut": 124300,
    "easyRate": 0.95,
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
    "easyRate": 0.95,
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
    "bossCut": 108100,
    "partyBossCut": null,
    "easyRate": 0.2881753663003663,
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
    "bossCut": 136000,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 129900,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 129900,
    "partyBossCut": null,
    "easyRate": 0.95,
    "newbieCut": 100,
    "guard": 380,
    "level": 290,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 700,
    "imgKey": "hard_bardrix"
  },
  {
    "id": "limbo",
    "nameEn": "Limbo",
    "nameKo": "림보",
    "difficulty": "Destiny",
    "bossCut": 118900,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 118900,
    "partyBossCut": null,
    "easyRate": 0.95,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 500,
    "imgKey": "hard_limbo"
  },
  {
    "id": "maleficStar",
    "nameEn": "Malefic Stars",
    "nameKo": "흉성",
    "difficulty": "Hard",
    "bossCut": 117500,
    "partyBossCut": null,
    "easyRate": 0.95,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 550,
    "imgKey": "hard_maleficStar"
  },
  {
    "id": "jupiter",
    "nameEn": "Jupiter",
    "nameKo": "유피테르",
    "difficulty": "Normal",
    "bossCut": 111700,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 108100,
    "partyBossCut": null,
    "easyRate": 0.76,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 340,
    "imgKey": "destiny_adversary"
  },
  {
    "id": "adversary",
    "nameEn": "First Adversary",
    "nameKo": "대적자",
    "difficulty": "Hard",
    "bossCut": 108100,
    "partyBossCut": null,
    "easyRate": 0.95,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 340,
    "imgKey": "hard_adversary"
  },
  {
    "id": "bardrix",
    "nameEn": "Baldrix",
    "nameKo": "발드릭스",
    "difficulty": "Normal",
    "bossCut": 106600,
    "partyBossCut": null,
    "easyRate": 0.95,
    "newbieCut": 100,
    "guard": 380,
    "level": 290,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 700,
    "imgKey": "normal_bardrix"
  },
  {
    "id": "kaling",
    "nameEn": "Kaling",
    "nameKo": "카링",
    "difficulty": "Hard",
    "bossCut": 99800,
    "partyBossCut": null,
    "easyRate": 0.7916666666666666,
    "newbieCut": 100,
    "guard": 380,
    "level": 285,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 350,
    "imgKey": "hard_kaling"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Extreme",
    "bossCut": 105700,
    "partyBossCut": null,
    "easyRate": 0.95,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 200,
    "imgKey": "extreme_seren"
  },
  {
    "id": "blackMage",
    "nameEn": "Black Mage",
    "nameKo": "검은 마법사",
    "difficulty": "Extreme",
    "bossCut": 94500,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 99800,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 98700,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 90900,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 90900,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "easyRate": 0.2,
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
    "bossCut": 69300,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 68200,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 64500,
    "partyBossCut": null,
    "easyRate": 0.9704301075268816,
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
    "bossCut": 47200,
    "partyBossCut": null,
    "easyRate": 0.6649999999999999,
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
    "bossCut": 108100,
    "partyBossCut": null,
    "easyRate": 6.114009582055534,
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
    "bossCut": 47200,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 0.7,
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
    "bossCut": 39300,
    "partyBossCut": null,
    "easyRate": 0.95,
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
    "easyRate": 1.0,
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
    "bossCut": 108100,
    "partyBossCut": null,
    "easyRate": 17.611309480434308,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 3,
    "arcaneForce": 0,
    "authenticForce": 220,
    "imgKey": "easy_adversary"
  },
  {
    "id": "blackMage",
    "nameEn": "Black Mage",
    "nameKo": "검은 마법사",
    "difficulty": "Champion",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.1,
    "newbieCut": 100,
    "guard": 300,
    "level": 275,
    "partyLimit": 1,
    "arcaneForce": 1320,
    "authenticForce": 0,
    "imgKey": "champion_blackMage"
  },
  {
    "id": "kalos",
    "nameEn": "Kalos",
    "nameKo": "칼로스",
    "difficulty": "Easy",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.0,
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
    "easyRate": 1.1,
    "newbieCut": 100,
    "guard": 300,
    "level": 275,
    "partyLimit": 6,
    "arcaneForce": 1320,
    "authenticForce": 0,
    "imgKey": "hard_blackMage"
  },
  {
    "id": "seren",
    "nameEn": "Chosen Seren",
    "nameKo": "세렌",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.0,
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
    "easyRate": 0.7,
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
    "easyRate": 1.0,
    "newbieCut": 100,
    "guard": 300,
    "level": 250,
    "partyLimit": 6,
    "arcaneForce": 900,
    "authenticForce": 0,
    "imgKey": "hard_verusHilla"
  },
  {
    "id": "darknell",
    "nameEn": "Darknell",
    "nameKo": "듄켈",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 0.7,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
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
    "easyRate": 1.0,
    "newbieCut": 100,
    "guard": 300,
    "level": 210,
    "partyLimit": 6,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_damien"
  },
  {
    "id": "papulatus",
    "nameEn": "Papulatus",
    "nameKo": "파풀라투스",
    "difficulty": "Chaos",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 300,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_papulatus"
  },
  {
    "id": "velum",
    "nameEn": "Vellum",
    "nameKo": "벨룸",
    "difficulty": "Chaos",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 200,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_velum"
  },
  {
    "id": "bloodyQueen",
    "nameEn": "Bloody Queen",
    "nameKo": "블러디 퀸",
    "difficulty": "Chaos",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 120,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_bloodyQueen"
  },
  {
    "id": "pierre",
    "nameEn": "Pierre",
    "nameKo": "피에르",
    "difficulty": "Chaos",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 80,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_pierre"
  },
  {
    "id": "vonbon",
    "nameEn": "Von Bon",
    "nameKo": "반반",
    "difficulty": "Chaos",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 100,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_vonbon"
  },
  {
    "id": "magnus",
    "nameEn": "Magnus",
    "nameKo": "매그너스",
    "difficulty": "Hard",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 120,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "hard_magnus"
  },
  {
    "id": "zakum",
    "nameEn": "Zakum",
    "nameKo": "자쿰",
    "difficulty": "Chaos",
    "bossCut": 500,
    "partyBossCut": null,
    "easyRate": 1.08,
    "newbieCut": 100,
    "guard": 100,
    "level": 200,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "chaos_zakum"
  },
  {
    "id": "maerin",
    "nameEn": "Maerin",
    "nameKo": "메이린",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.0,
    "newbieCut": 100,
    "guard": 380,
    "level": 280,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "hard_maerin"
  },
  {
    "id": "maerin",
    "nameEn": "Maerin",
    "nameKo": "메이린",
    "difficulty": "Normal",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.0,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_maerin"
  },
  {
    "id": "kai",
    "nameEn": "Kai",
    "nameKo": "카이",
    "difficulty": "Hard",
    "bossCut": 40600,
    "partyBossCut": null,
    "easyRate": 1.1,
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
    "easyRate": 1.1,
    "newbieCut": 100,
    "guard": 380,
    "level": 270,
    "partyLimit": 1,
    "arcaneForce": 0,
    "authenticForce": 0,
    "imgKey": "normal_kai"
  }
] as BossCutEntry[];

export const BOSS_ICON_CDN = "https://maplescouter.com/bossIcon";

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

/**
 * MapleScouter analytics label from clearRate (module Rn).
 * @param clearRate ratio (1 = 100%)
 * @param isPartyBoss whether entry uses partyBossCut
 * @param partyLimit max party size
 * @param newbieMode newbie standards toggle
 * @param newbieCut newbie threshold percent (default 100)
 */
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
};

export function evaluateBossClears(args: {
  boss300: number;
  boss380: number;
  level: number;
  arcaneForce: number;
  authenticForce: number;
  relevantOnly?: boolean;
  newbieMode?: boolean;
}): BossClearRow[] {
  const {
    boss300,
    boss380,
    level,
    arcaneForce,
    authenticForce,
    relevantOnly = true,
    newbieMode = false,
  } = args;

  const rows: BossClearRow[] = BOSS_CUTS.map((entry) => {
    const isPartyBoss = entry.partyBossCut != null && entry.bossCut == null;
    const cut = (isPartyBoss ? entry.partyBossCut : entry.bossCut) || 0;
    const userStat = entry.guard === 380 ? boss380 : boss300;
    // MapleScouter clearRate ≈ damage ratio × easyRate; converted-stat ratio is a close proxy.
    const clearRate = cut > 0 ? (userStat / cut) * (entry.easyRate || 1) : 0;
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
    };
  });

  const filtered = relevantOnly
    ? rows.filter((e) => {
        if (e.cantEnter) return true;
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

  return filtered.sort((a, b) => b.cut - a.cut);
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
