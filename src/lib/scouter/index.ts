export type { ScouterInput, ScouterResult, StatTriple, StatKey } from "./types";
export {
  EMPTY_TRIPLE,
  defaultScouterInput,
} from "./types";
export {
  calculateScouter,
  resolveMainSecondary,
  resolveOzRingStats,
  BOSS_PDR_PRESETS,
} from "./calc";
export {
  SCOUTER_CDN,
  BUFF_DEFS,
  LINK_DEFS,
  HEXA_SLOT_COUNT,
  HEXA_MAX_LEVEL,
  getHexaSlots,
  defaultBuffState,
  defaultLinkState,
  defaultHexaLevels,
  clampHexaForGms,
  GMS_UNAVAILABLE_HEXA_INDICES,
  type BuffDef,
  type BuffState,
  type LinkState,
  type HexaSlot,
} from "./buffs";
export {
  computeClassFinalDamage,
  classFinalDamage,
  CLASS_FD,
} from "./class-fd";
export {
  computeCombatPower,
  combatExceptionFinalDamagePercent,
} from "./combat-power";
export {
  bowConvertAttackBase,
  BOW_EQUIVALENT_CLASSES,
  GENESIS_BOW_BASE,
} from "./bow-att";
export {
  CLASS_WEAPON_CONSTANT,
  ONE_HAND_SWORD_CLASSES,
  ONE_HAND_WEAPON_CONSTANT,
  getWeaponConstant,
  supportsOneHandSword,
} from "./weapon-constant";
export {
  CLASS_SPECIFIC_REQUIREMENTS,
  getClassSpecificRequirements,
} from "./class-requirements";
export {
  getMissingRequiredScouterFields,
  focusScouterField,
  type MissingScouterField,
  type ScouterRequiredMode,
} from "./validate";
export {
  parseScouterOcrText,
  applyScouterOcrPatch,
  SCOUTER_OCR_EXAMPLE,
  type ScouterOcrPatch,
  type ScouterOcrParseResult,
} from "./ocr-parse";
export {
  normalizeLeadingDotDecimal,
  parseUserNumber,
  USER_NUMBER_RE,
} from "./parse-number";
export {
  recognizeScouterScreenshot,
  preprocessScouterScreenshot,
  SCOUTER_OCR_FAIL_MESSAGE,
  type OcrImageResult,
  type OcrProgress,
} from "./ocr-image";
export {
  detectStatPanelCrop,
  scaleStatCrop,
  type OcrWordBox,
  type StatCropRect,
} from "./ocr-stat-crop";
export {
  OZ_RINGS,
  OZ_CONTINUOUS_STATUS,
  INNER_ABILITY_OPTIONS,
  getVisibleOzRings,
  OZ_RING_MAX,
  type OzContinuousStatus,
  type OzRingField,
} from "./oz";
export {
  BOSS_CUTS,
  BOSS_ICON_CDN,
  BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
  evaluateBossClears,
  bossClearLabelEn,
  labelTone,
  labelPillClass,
  difficultyRibbonClass,
  type BossCutEntry,
  type BossClearRow,
  type BossClearLabel,
  type BossClearFightMinutes,
} from "./boss-cuts";
export {
  getBossHoverInfo,
  getBossRegionHpTotals,
  BOSS_CRYSTAL_ICON,
  formatBossHp,
  formatCrystalMeso,
  type BossHoverInfo,
  type BossDropInfo,
  type BossHpPhase,
  type BossHpRegion,
} from "./boss-info";
