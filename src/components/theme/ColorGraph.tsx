"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hexToHue, hueToHex, parseAccentHex } from "@/lib/theme";

function hexToSat(hex: string): number {
  const p = parseAccentHex(hex);
  if (!p) return 0.72;
  const r = parseInt(p.slice(1, 3), 16) / 255;
  const g = parseInt(p.slice(3, 5), 16) / 255;
  const b = parseInt(p.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function paintGraph(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const sat = 1 - y / Math.max(h - 1, 1);
    for (let x = 0; x < w; x++) {
      const hue = (x / Math.max(w - 1, 1)) * 359;
      const hex = hueToHex(hue, sat, 0.58);
      const i = (y * w + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** 2D hue × saturation graph + HEX field for a custom theme color. */
export function ColorGraph({
  color,
  onChange,
  onSave,
}: {
  color: string;
  onChange: (hex: string) => void;
  onSave?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hex = parseAccentHex(color) ?? "#3b82f6";
  const hue = hexToHue(hex) ?? 250;
  const sat = hexToSat(hex);
  const [draft, setDraft] = useState(hex.slice(1));

  useEffect(() => {
    setDraft(hex.slice(1));
  }, [hex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      paintGraph(ctx, canvas.width, canvas.height);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      onChange(hueToHex(x * 359, 1 - y, 0.58));
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <div className="relative h-28 overflow-hidden rounded-md border border-border/60">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full cursor-crosshair"
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            pick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            pick(e.clientX, e.clientY);
          }}
        />
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${(hue / 359) * 100}%`,
            top: `${(1 - sat) * 100}%`,
            backgroundColor: hex,
          }}
          aria-hidden
        />
      </div>
      <div className="flex items-stretch gap-1.5">
        <label className="flex min-w-0 flex-[3] items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            HEX
          </span>
          <span className="font-mono text-xs text-muted-foreground">#</span>
          <input
            value={draft}
            spellCheck={false}
            autoComplete="off"
            maxLength={6}
            aria-label="Theme color hex"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase outline-none"
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
              setDraft(raw);
              const next = parseAccentHex(raw);
              if (next) onChange(next);
            }}
          />
        </label>
        {onSave ? (
          <button
            type="button"
            onClick={onSave}
            className="min-w-[3.25rem] flex-[1] shrink-0 rounded-md border border-accent/50 bg-accent-soft px-2 text-xs font-semibold text-foreground hover:bg-accent hover:text-primary-foreground"
          >
            Save
          </button>
        ) : null}
      </div>
    </div>
  );
}
