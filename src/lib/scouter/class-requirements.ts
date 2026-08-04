/**
 * MapleScouter class-specific input requirements (English).
 * Assumed when using class FD tables. Omit classes with no extra requirements.
 */
export const CLASS_SPECIFIC_REQUIREMENTS: Record<string, string> = {
  nl: "Bleeding Toxin On",
  dk: "Beholder, Cross of Styx, Dark Resonance On",
  ds: "Metamorphosis On",
  da: "Diabolic Recovery, Decent Holy Fountain On; Overload Release Off",
  db: "Hidden Blade On / Final Cut Off",
  lara: "Manifestation Off",
  len: "Common conditions only",
  lumi: "Equalize / Potentic Meditation On",
  merc: "Ancient Warding, Elvish Blessing On; 0 stacks",
  mech: "Tank form; Loaded Dice Off",
  mihile: "Encourage, Soul Rage, Soul Link On (no party)",
  viper: "Viper Instinct On; not fully charged; Loaded Dice Off",
  bam: "Dark Aura, Battle Rage On",
  bm: "Sharp Eyes On",
  blaster: "0 stacks",
  bs: "Advanced Blessing On; Vengeance On",
  sdw: "Flip of the Coin 0 stacks",
  sm: "Soluna Time On; Cosmic Off",
  striker: "Loaded Dice Off; Lightning Off",
  xbm: "Sharp Eyes On",
  adele: "Resonance stacks Off",
  aran: "500 combo; Blessing Maha On",
  ark: "Lef form; Spell Buff Off; Loaded Dice Off",
  fp: "Meditation On",
  il: "Meditation On",
  evan: "Onyx Blessing On; Empathic Link Off",
  ab: "Soul Gaze On; Loaded Dice Off",
  wh: "Sharp Eyes; Howling Summon Jaguar On",
  wb: "Sharp Eyes On",
  eunwol: "Loaded Dice Off",
  illium: "0 stacks",
  xenon: "Supply 20/20; Incline Power Off; Oparts Code Off",
  zero: "Zero-Beta Divine Force",
  cadena: "0 stacks",
  kaiser: "Human form, Attack mode, Morph 0, Blaze Up",
  cm: "Monkey Magic On; Loaded Dice Off",
  captain: "Pirate Style On; Loaded Dice Off",
  /** Divine Blessing FD is baked into Paladin class FD (65.77). */
  paladin: "Combat Orders, Divine Blessing On; 0 Charge stacks",
  pf: "Sharp Eyes On",
  phantom: "Final Cut Off; Cross of Styx Off; Spirit Blade Off",
  fw: "Spirit of Flame On",
  hero: "10 combo; Enrage On; Rage",
  mx: "Inner Training 5 stacks; Loaded Dice Off",
  lynn: "Nature's Providence On",
  sia: "Celestial Align On",
};

export function getClassSpecificRequirements(charType: string): string {
  return CLASS_SPECIFIC_REQUIREMENTS[charType] ?? "";
}
