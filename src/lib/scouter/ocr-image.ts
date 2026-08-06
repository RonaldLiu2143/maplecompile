/**
 * Client-side screenshot OCR helpers for Scouter import.
 * Uses tesseract.js with light preprocess (scale + contrast) for small UI text.
 */

export type OcrProgress = {
  status: string;
  progress: number;
};

export type OcrImageResult = {
  text: string;
  cancelled: boolean;
};

export type OcrImageOptions = {
  signal?: AbortSignal;
  onProgress?: (info: OcrProgress) => void;
};

const FAIL_MESSAGE =
  "Couldn't read stats — try clearer screenshot or paste text";

export { FAIL_MESSAGE as SCOUTER_OCR_FAIL_MESSAGE };

/** Scale up and boost contrast so MapleStory char-window glyphs OCR better. */
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

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("Failed to encode preprocessed image");
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Run Tesseract OCR on a screenshot. Pass AbortSignal to cancel (terminates worker).
 */
export async function recognizeScouterScreenshot(
  file: Blob,
  options: OcrImageOptions = {},
): Promise<OcrImageResult> {
  const { signal, onProgress } = options;

  if (signal?.aborted) {
    return { text: "", cancelled: true };
  }

  onProgress?.({ status: "Preparing image…", progress: 0 });

  let prepared: Blob;
  try {
    prepared = await preprocessScouterScreenshot(file);
  } catch {
    throw new Error(FAIL_MESSAGE);
  }

  if (signal?.aborted) {
    return { text: "", cancelled: true };
  }

  const { createWorker, PSM } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (signal?.aborted) return;
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

  try {
    if (signal?.aborted) {
      return { text: "", cancelled: true };
    }

    // Sparse text suits labeled UI panels better than a single paragraph block.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    const { data } = await worker.recognize(prepared);
    if (signal?.aborted) {
      return { text: "", cancelled: true };
    }

    const text = (data.text ?? "").trim();
    if (!text) {
      throw new Error(FAIL_MESSAGE);
    }
    return { text, cancelled: false };
  } catch (err) {
    if (signal?.aborted) {
      return { text: "", cancelled: true };
    }
    if (err instanceof Error && err.message === FAIL_MESSAGE) throw err;
    throw new Error(FAIL_MESSAGE);
  } finally {
    signal?.removeEventListener("abort", abort);
    try {
      await worker.terminate();
    } catch {
      /* already terminated on abort */
    }
  }
}
