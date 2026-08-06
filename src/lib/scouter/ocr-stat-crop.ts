/**
 * Detect MapleStory STAT window bounds from OCR word boxes so we can crop
 * before the full OCR pass (avoids Hyper Stats / Ability / char card noise).
 */

export type OcrWordBox = {
  text: string;
  /** Absolute pixel coords in the image that produced these boxes. */
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
};

export type StatCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BBox = OcrWordBox["bbox"];

function normWord(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, "")
    .trim();
}

function centerX(b: BBox): number {
  return (b.x0 + b.x1) / 2;
}

function centerY(b: BBox): number {
  return (b.y0 + b.y1) / 2;
}

function sameRow(a: BBox, b: BBox, tol: number): boolean {
  return Math.abs(centerY(a) - centerY(b)) <= tol;
}

function unionBox(a: BBox, b: BBox): BBox {
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

type IndexedWord = OcrWordBox & { n: string };

function indexWords(words: OcrWordBox[]): IndexedWord[] {
  return words
    .map((w) => ({ ...w, n: normWord(w.text) }))
    .filter((w) => w.n.length > 0 && (w.confidence == null || w.confidence >= 40));
}

function matchPat(n: string, p: string | RegExp): boolean {
  return typeof p === "string" ? n === p : p.test(n);
}

/** Find a left→right word pair on the same row. */
function findPair(
  words: IndexedWord[],
  left: string | RegExp,
  right: string | RegExp,
  rowTol: number,
  maxGap: number,
): BBox | null {
  for (const a of words) {
    if (!matchPat(a.n, left)) continue;
    for (const b of words) {
      if (a === b || !matchPat(b.n, right)) continue;
      if (!sameRow(a.bbox, b.bbox, rowTol)) continue;
      if (b.bbox.x0 < a.bbox.x0 - 4) continue;
      const gap = b.bbox.x0 - a.bbox.x1;
      if (gap >= 0 && gap <= maxGap) return unionBox(a.bbox, b.bbox);
    }
  }
  return null;
}

function findMerged(words: IndexedWord[], ...names: string[]): BBox | null {
  const hit = words.find((w) => names.includes(w.n));
  return hit?.bbox ?? null;
}

/**
 * True STAT title bar is a lone "STAT" (not "HYPER STATS").
 * Prefer the occurrence nearest a Combat Power row.
 */
function findStatTitle(
  words: IndexedWord[],
  combatY: number | null,
  rowTol: number,
): IndexedWord | null {
  const candidates = words.filter((w) => w.n === "stat");
  if (candidates.length === 0) return null;

  const scored = candidates.filter((stat) => {
    const hyperNearby = words.some(
      (w) =>
        (w.n === "hyper" || w.n === "hyperstats") &&
        sameRow(w.bbox, stat.bbox, rowTol * 1.5) &&
        Math.abs(centerX(w.bbox) - centerX(stat.bbox)) < rowTol * 12,
    );
    return !hyperNearby;
  });

  const pool = scored.length > 0 ? scored : candidates;
  if (combatY == null) return pool[0] ?? null;

  return pool.reduce((best, w) => {
    const bestDist = Math.abs(centerY(best.bbox) - combatY);
    const dist = Math.abs(centerY(w.bbox) - combatY);
    // Title sits just above Combat Power.
    if (centerY(w.bbox) > combatY + rowTol) return best;
    return dist < bestDist ? w : best;
  });
}

/** Labels that appear inside the STAT panel (not Hyper Stats / char card). */
const STAT_PANEL_HINTS = [
  "combat",
  "final",
  "boss",
  "ignore",
  "critical",
  "crit",
  "arcane",
  "sacred",
  "attack",
  "magic",
  "damage",
  "range",
  "defense",
  "cooldown",
  "buff",
  "mesos",
  "item",
  "star",
  "force",
  "power",
  "ability",
  "hyper",
  "str",
  "dex",
  "int",
  "luk",
  "hp",
  "mp",
  "ied",
];

/**
 * Estimate STAT window crop from a quick OCR locate pass.
 * Returns null when anchors are too weak — caller should OCR full image.
 */
export function detectStatPanelCrop(
  words: OcrWordBox[],
  imageWidth: number,
  imageHeight: number,
): StatCropRect | null {
  if (imageWidth < 32 || imageHeight < 32 || words.length < 4) return null;

  const indexed = indexWords(words);
  if (indexed.length < 4) return null;

  const rowTol = Math.max(10, Math.round(imageHeight * 0.012));
  const maxPairGap = Math.max(80, Math.round(imageWidth * 0.12));

  const combatBox =
    findPair(indexed, "combat", "power", rowTol, maxPairGap) ??
    findMerged(indexed, "combatpower");

  const combatY = combatBox ? centerY(combatBox) : null;

  const bossDamage =
    findPair(indexed, "boss", /^damage|dmg$/, rowTol, maxPairGap) ??
    findMerged(indexed, "bossdamage", "bossdmg");

  const ignoreDef =
    findPair(indexed, "ignore", /^def|defense|defence$/, rowTol, maxPairGap) ??
    findMerged(indexed, "ignoredefense", "ignoredefence", "ied");

  const finalDamage =
    findPair(indexed, "final", /^damage|dmg$/, rowTol, maxPairGap) ??
    findMerged(indexed, "finaldamage", "finaldmg");

  const attackPower =
    findPair(indexed, /^attack|att$/, "power", rowTol, maxPairGap) ??
    findMerged(indexed, "attackpower");

  const criticalDamage =
    findPair(indexed, /^critical|crit$/, /^damage|dmg$/, rowTol, maxPairGap) ??
    findMerged(indexed, "criticaldamage", "critdamage", "critdmg");

  const arcane =
    findPair(indexed, "arcane", /^force|power$/, rowTol, maxPairGap) ??
    findMerged(indexed, "arcaneforce", "arcanepower");

  const sacred =
    findPair(indexed, /^sacred|authentic$/, /^force|power$/, rowTol, maxPairGap) ??
    findMerged(indexed, "sacredforce", "sacredpower", "authenticforce", "authenticpower");

  const hyperStatsBtn =
    findPair(indexed, "hyper", "stats", rowTol, maxPairGap) ??
    findMerged(indexed, "hyperstats");

  const abilityBtns = indexed.filter((w) => w.n === "ability");

  const statTitle = findStatTitle(indexed, combatY, rowTol);

  const combatAnchors = [
    bossDamage,
    ignoreDef,
    finalDamage,
    attackPower,
    criticalDamage,
  ].filter(Boolean).length;

  // Need a strong STAT-window signal: Combat Power, or STAT title + combat stats.
  if (!combatBox && !statTitle) return null;
  if (!combatBox && combatAnchors < 2) return null;

  let top = Infinity;
  let bottom = 0;

  const extend = (b: BBox | null | undefined) => {
    if (!b) return;
    top = Math.min(top, b.y0);
    bottom = Math.max(bottom, b.y1);
  };

  extend(statTitle?.bbox);
  extend(combatBox);
  extend(bossDamage);
  extend(ignoreDef);
  extend(finalDamage);
  extend(attackPower);
  extend(criticalDamage);
  extend(arcane);
  extend(sacred);

  if (!Number.isFinite(top)) return null;

  const panelCenterX = combatBox
    ? centerX(combatBox)
    : statTitle
      ? centerX(statTitle.bbox)
      : imageWidth / 2;

  // Footer Hyper Stats / Ability sit below Combat Power on the STAT chrome —
  // ignore the left HYPER STATS panel title (far left / above combat band).
  const footerBoxes: BBox[] = [];
  if (hyperStatsBtn) footerBoxes.push(hyperStatsBtn);
  for (const a of abilityBtns) footerBoxes.push(a.bbox);

  for (const b of footerBoxes) {
    if (combatY != null && centerY(b) < combatY + rowTol * 3) continue;
    if (Math.abs(centerX(b) - panelCenterX) > imageWidth * 0.28) continue;
    extend(b);
  }

  // If bottom barely moved, estimate panel height from typical STAT aspect.
  const minHeight = Math.round(imageHeight * 0.28);
  if (bottom - top < minHeight) {
    bottom = Math.min(imageHeight, top + Math.round(imageHeight * 0.55));
  }

  // Horizontal: STAT-hint words in the vertical band near panel center.
  const bandPad = Math.round((bottom - top) * 0.08);
  const y0 = top - bandPad;
  const y1 = bottom + bandPad;
  const inBand = indexed.filter((w) => {
    const cy = centerY(w.bbox);
    if (cy < y0 || cy > y1) return false;
    const hint = STAT_PANEL_HINTS.some(
      (h) => w.n === h || w.n.startsWith(h) || (h.length <= 3 && w.n === h),
    );
    if (!hint) return false;
    // Drop far-left Hyper Stats column when Combat Power is known.
    if (combatBox && centerX(w.bbox) < panelCenterX - imageWidth * 0.32) {
      return false;
    }
    return Math.abs(centerX(w.bbox) - panelCenterX) < imageWidth * 0.3;
  });

  let left: number;
  let right: number;

  if (inBand.length >= 3) {
    left = Math.min(...inBand.map((w) => w.bbox.x0));
    right = Math.max(...inBand.map((w) => w.bbox.x1));
  } else if (combatBox) {
    // Combat Power row spans most of the STAT chrome; expand to typical panel width.
    const combatW = Math.max(1, combatBox.x1 - combatBox.x0);
    const panelW = Math.max(combatW * 2.2, imageWidth * 0.18);
    left = panelCenterX - panelW * 0.48;
    right = panelCenterX + panelW * 0.52;
  } else if (statTitle) {
    const panelW = imageWidth * 0.22;
    left = centerX(statTitle.bbox) - panelW * 0.5;
    right = centerX(statTitle.bbox) + panelW * 0.5;
  } else {
    return null;
  }

  // Padding — include title bar chrome and footer buttons.
  const padX = Math.round(Math.max(8, (right - left) * 0.06));
  const padTop = Math.round(Math.max(10, (bottom - top) * 0.04));
  const padBottom = Math.round(Math.max(14, (bottom - top) * 0.08));

  left = Math.floor(left - padX);
  right = Math.ceil(right + padX);
  top = Math.floor(top - padTop);
  bottom = Math.ceil(bottom + padBottom);

  left = Math.max(0, left);
  top = Math.max(0, top);
  right = Math.min(imageWidth, right);
  bottom = Math.min(imageHeight, bottom);

  const width = right - left;
  const height = bottom - top;

  // Reject absurd crops (too small, or nearly full-frame).
  if (width < 80 || height < 120) return null;
  if (width * height > imageWidth * imageHeight * 0.85) return null;
  if (width / height > 1.4 || height / width > 4) return null;

  return { x: left, y: top, width, height };
}

/** Scale a crop rect from locate-image space into original image space. */
export function scaleStatCrop(
  crop: StatCropRect,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): StatCropRect {
  const sx = toWidth / fromWidth;
  const sy = toHeight / fromHeight;
  const x = Math.max(0, Math.floor(crop.x * sx));
  const y = Math.max(0, Math.floor(crop.y * sy));
  const width = Math.min(toWidth - x, Math.ceil(crop.width * sx));
  const height = Math.min(toHeight - y, Math.ceil(crop.height * sy));
  return { x, y, width, height };
}
