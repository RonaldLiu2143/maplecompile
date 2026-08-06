"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import {
  applyScouterOcrPatch,
  parseScouterOcrText,
  SCOUTER_OCR_EXAMPLE,
} from "@/lib/scouter/ocr-parse";
import type { ScouterInput } from "@/lib/scouter";

type Props = {
  input: ScouterInput;
  onApply: (next: ScouterInput, summary: string) => void;
};

/**
 * Paste OCR / character-window text (or drop a screenshot as a reminder to
 * paste recognized text). No Tesseract dependency — text parse is the MVP.
 */
export function ScouterOcrImport({ input, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const clearPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const acceptImage = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      clearPreview();
      setPreviewUrl(URL.createObjectURL(file));
      setStatus(
        "Screenshot loaded. Paste OCR text below (Win+H / Lens / snipping text actions) — in-browser image OCR is not bundled.",
      );
      setError(null);
      setOpen(true);
      requestAnimationFrame(() => textRef.current?.focus());
    },
    [clearPreview],
  );

  const runParse = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setError("Paste character-window text first.");
        setStatus(null);
        return;
      }
      const { patch, matched, warnings } = parseScouterOcrText(trimmed);
      if (matched.length === 0) {
        setError(warnings[0] ?? "No stats recognized.");
        setStatus(null);
        return;
      }
      const next = applyScouterOcrPatch(input, patch);
      const summary = `Imported: ${matched.join(", ")}`;
      onApply(next, summary);
      setError(null);
      setStatus(summary);
      setText(trimmed);
    },
    [input, onApply],
  );

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        acceptImage(item.getAsFile());
        return;
      }
    }
    // Text paste into the panel (not only the textarea) — apply if panel focused.
    const clip = e.clipboardData.getData("text/plain");
    if (clip && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      setText(clip);
      setOpen(true);
      runParse(clip);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) acceptImage(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptImage(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  return (
    <div
      className="border-b border-border/40 bg-surface-muted/20 px-3 py-2.5"
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wide">
            OCR / paste import
          </h3>
          <p className="mt-0.5 text-[11px] opacity-60">
            Paste character-window text, or drop a screenshot then paste OCR
            text. Required for calc: main, sub, ATT/MATT.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Import"}
        </button>
      </div>

      {open ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
              onClick={() => fileRef.current?.click()}
            >
              Upload screenshot
            </button>
            <button
              type="button"
              className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
              onClick={() => {
                setText(SCOUTER_OCR_EXAMPLE);
                setError(null);
                setStatus("Example loaded — click Apply to fill fields.");
              }}
            >
              Load example
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {previewUrl ? (
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="max-h-28 max-w-[12rem] rounded border border-border/50 object-contain"
              />
              <button
                type="button"
                className="text-[11px] font-medium opacity-60 hover:opacity-100"
                onClick={clearPreview}
              >
                Clear image
              </button>
            </div>
          ) : null}

          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={`Paste OCR / character stats, one field per line…\n\n${SCOUTER_OCR_EXAMPLE}`}
            className="w-full resize-y rounded border border-border/50 bg-background px-2.5 py-2 font-mono text-xs outline-none focus:border-accent"
            aria-label="OCR or character stats text"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              onClick={() => runParse(text)}
            >
              Apply to fields
            </button>
            <button
              type="button"
              className="rounded border border-border/50 bg-background px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              onClick={() => {
                setText("");
                setError(null);
                setStatus(null);
                clearPreview();
              }}
            >
              Clear
            </button>
            {status ? (
              <span className="text-[11px] font-medium text-accent">{status}</span>
            ) : null}
            {error ? (
              <span className="text-[11px] font-medium text-red-500">{error}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
