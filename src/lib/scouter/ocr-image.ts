/**
 * Client-side screenshot OCR helpers for Scouter import.
 * Uses tesseract.js with STAT-panel crop + light preprocess for UI text.
 */

import {
  detectStatPanelCrop,
  scaleStatCrop,
  type OcrWordBox,
  type StatCropRect,
} from "./ocr-stat-crop";

export type OcrProgress = {
  status: string;
  progress: number;
};

export type OcrImageResult = {
  text: string;
  cancelled: boolean;
  /** True when a STAT-window crop was used for the main OCR pass. */
  croppedToStatPanel?: boolean;
};

export type OcrImageOptions = {
  signal?: AbortSignal;
  onProgress?: (info: OcrProgress) => void;
};

const FAIL_MESSAGE =
  "Couldn't read stats — try clearer screenshot or paste text";

export { FAIL_MESSAGE as SCOUTER_OCR_FAIL_MESSAGE };

const LOCATE_MAX_EDGE = 960;

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

async function blobToBitmap(source: Blob | ImageBitmap): Promise<ImageBitmap> {
  return source instanceof ImageBitmap ? source : createImageBitmap(source);
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Failed to encode image");
  return blob;
}

/** Downscale for a fast locate OCR pass (word boxes only). */
async function makeLocateBitmap(
  bitmap: ImageBitmap,
): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const maxEdge = Math.max(bitmap.width, bitmap.height);
  if (maxEdge <= LOCATE_MAX_EDGE) {
    // Caller owns the original; clone via canvas so we can close independently.
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0);
    const located = await createImageBitmap(canvas);
    return { bitmap: located, width: canvas.width, height: canvas.height };
  }

  const scale = LOCATE_MAX_EDGE / maxEdge;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const located = await createImageBitmap(canvas);
  return { bitmap: located, width: w, height: h };
}

async function cropBitmap(
  bitmap: ImageBitmap,
  crop: StatCropRect,
): Promise<ImageBitmap> {
  const x = Math.max(0, Math.min(bitmap.width - 1, crop.x));
  const y = Math.max(0, Math.min(bitmap.height - 1, crop.y));
  const width = Math.max(1, Math.min(bitmap.width - x, crop.width));
  const height = Math.max(1, Math.min(bitmap.height - y, crop.height));
  return createImageBitmap(bitmap, x, y, width, height);
}

/** Scale up and boost contrast so MapleStory STAT-window glyphs OCR better. */
export async function preprocessScouterScreenshot(
  source: Blob | ImageBitmap,
): Promise<Blob> {
  const bitmap =
    source instanceof ImageBitmap ? source : await createImageBitmap(source);

  try {
    const maxEdge = Math.max(bitmap.width, bitmap.height);
    // Small / medium captures need more scale; huge monitors less so.
    const scale =
      maxEdge < 900 ? 3 : maxEdge < 1400 ? 2.5 : maxEdge < 2000 ? 2 : 1.5;

    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    // Contrast factor ~1.45 on grayscale luminance.
    const contrast = 1.45;
    const factor =
      (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let v = factor * (g - 128) + 128;
      // Soft threshold toward black/white for UI panels.
      if (v < 90) v = Math.max(0, v * 0.7);
      else if (v > 180) v = Math.min(255, 210 + (v - 180) * 0.5);
      v = Math.max(0, Math.min(255, v));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);

    return await canvasToPngBlob(canvas);
  } finally {
    bitmap.close();
  }
}

function bitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}

/** Flatten tesseract Page blocks → words (typed Page has no top-level words). */
function wordsFromTesseractPage(data: {
  blocks?: Array<{
    paragraphs?: Array<{
      lines?: Array<{
        words?: Array<{
          text: string;
          confidence: number;
          bbox: { x0: number; y0: number; x1: number; y1: number };
        }>;
      }>;
    }>;
  }> | null;
  words?: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}): OcrWordBox[] {
  const out: OcrWordBox[] = [];
  const push = (w: {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }) => {
    if (!(w.text ?? "").trim()) return;
    out.push({ text: w.text, bbox: w.bbox, confidence: w.confidence });
  };

  if (data.words?.length) {
    for (const w of data.words) push(w);
    return out;
  }

  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of line.words ?? []) push(w);
      }
    }
  }
  return out;
}

/**
 * Run Tesseract OCR on a screenshot. Pass AbortSignal to cancel (terminates worker).
 * Tries to crop to the STAT panel first; falls back to full image if detection fails.
 */
export async function recognizeScouterScreenshot(
  file: Blob,
  options: OcrImageOptions = {},
): Promise<OcrImageResult> {
  const { signal, onProgress } = options;

  if (aborted(signal)) {
    return { text: "", cancelled: true };
  }

  onProgress?.({ status: "Preparing image…", progress: 0 });

  let original: ImageBitmap;
  try {
    original = await blobToBitmap(file);
  } catch {
    throw new Error(FAIL_MESSAGE);
  }

  const { createWorker, PSM } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (aborted(signal)) return;
      const progress =
        typeof m.progress === "number" ? Math.round(m.progress * 100) : 0;
      const status =
        m.status === "recognizing text"
          ? `Reading stats… ${progress}%`
          : m.status === "loading language traineddata"
            ? "Loading OCR model…"
            : m.status === "initializing tesseract"
              ? "Starting OCR…"
              : m.status
                ? `OCR: ${m.status}`
                : "Reading stats…";
      onProgress?.({ status, progress });
    },
  });

  const abort = () => {
    void worker.terminate();
  };
  signal?.addEventListener("abort", abort, { once: true });

  let locateBmp: ImageBitmap | null = null;
  let ocrSource: ImageBitmap | null = null;
  let croppedToStatPanel = false;

  try {
    if (aborted(signal)) {
      return { text: "", cancelled: true };
    }

    // --- Locate pass: downscaled OCR → STAT panel crop ---
    onProgress?.({ status: "Finding STAT window…", progress: 0 });
    try {
      const located = await makeLocateBitmap(original);
      locateBmp = located.bitmap;

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
        user_defined_dpi: "150",
      });

      const locateCanvas = bitmapToCanvas(locateBmp);
      const locateResult = await worker.recognize(
        locateCanvas,
        undefined,
        { text: true, blocks: true },
      );
      if (aborted(signal)) {
        return { text: "", cancelled: true };
      }

      const words = wordsFromTesseractPage(locateResult.data);
      const locateCrop = detectStatPanelCrop(
        words,
        located.width,
        located.height,
      );

      if (locateCrop) {
        const fullCrop = scaleStatCrop(
          locateCrop,
          located.width,
          located.height,
          original.width,
          original.height,
        );
        ocrSource = await cropBitmap(original, fullCrop);
        croppedToStatPanel = true;
        onProgress?.({ status: "Cropped to STAT window…", progress: 0 });
      }
    } catch {
      // Locate is best-effort; fall through to full-image OCR.
      croppedToStatPanel = false;
    } finally {
      locateBmp?.close();
      locateBmp = null;
    }

    if (aborted(signal)) {
      return { text: "", cancelled: true };
    }

    // --- Main OCR pass on crop (or full image) ---
    const sourceForOcr = ocrSource ?? original;
    let prepared: Blob;
    try {
      // preprocessScouterScreenshot closes its bitmap copy; pass a clone.
      const clone = await createImageBitmap(sourceForOcr);
      prepared = await preprocessScouterScreenshot(clone);
    } catch {
      throw new Error(FAIL_MESSAGE);
    }

    if (aborted(signal)) {
      return { text: "", cancelled: true };
    }

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    onProgress?.({ status: "Reading stats…", progress: 0 });
    const { data } = await worker.recognize(prepared);
    if (aborted(signal)) {
      return { text: "", cancelled: true };
    }

    const text = (data.text ?? "").trim();
    if (!text) {
      throw new Error(FAIL_MESSAGE);
    }
    return { text, cancelled: false, croppedToStatPanel };
  } catch (err) {
    if (aborted(signal)) {
      return { text: "", cancelled: true };
    }
    if (err instanceof Error && err.message === FAIL_MESSAGE) throw err;
    throw new Error(FAIL_MESSAGE);
  } finally {
    signal?.removeEventListener("abort", abort);
    ocrSource?.close();
    original.close();
    try {
      await worker.terminate();
    } catch {
      /* already terminated on abort */
    }
  }
}
