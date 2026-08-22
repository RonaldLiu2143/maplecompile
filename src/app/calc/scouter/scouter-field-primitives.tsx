"use client";

import { useState, type ReactNode } from "react";
import {
  clampScouterField,
  SCOUTER_CDN,
  type ScouterCappedField,
} from "@/lib/scouter";
import { parseUserNumber } from "@/lib/scouter/parse-number";

export const scouterCellClass =
  "border border-border/50 bg-background px-2 py-2 text-base outline-none focus:relative focus:z-10 focus:border-accent min-h-11 sm:py-1.5 sm:text-sm";

export const scouterLabelCellClass =
  "border border-border/50 bg-surface-muted/50 px-2 py-1.5 text-sm font-medium";

const NUM_DRAFT_RE = /^[+-]?[\d,]*\.?[\d,]*$/;

export function ScouterNumInput({
  value,
  onChange,
  className = "",
  placeholder = "0",
  readOnly,
  fieldId,
  capField,
  max,
  decimals,
}: {
  value: number;
  onChange?: (n: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  fieldId?: string;
  capField?: ScouterCappedField;
  max?: number;
  decimals?: number;
}) {
  const n = Number.isFinite(value) ? value : 0;
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : n === 0 ? "" : String(n);

  const commit = (raw: number) => {
    if (!onChange) return;
    let next = Number.isFinite(raw) ? raw : 0;
    if (capField) next = clampScouterField(capField, next);
    else {
      if (typeof max === "number") next = Math.min(Math.max(0, next), max);
      if (typeof decimals === "number") {
        if (decimals <= 0) next = Math.round(next);
        else {
          const f = 10 ** decimals;
          next = Math.round(next * f) / f;
        }
      }
    }
    onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      placeholder={placeholder}
      data-scouter-field={fieldId}
      className={`${scouterCellClass} w-full min-w-0 text-right tabular-nums placeholder:text-foreground/30 ${
        readOnly ? "bg-surface-muted/40 text-foreground/70" : ""
      } ${className}`}
      value={display}
      onFocus={
        !readOnly ? () => setDraft(n === 0 ? "" : String(n)) : undefined
      }
      onBlur={
        !readOnly
          ? () => {
              if (draft !== null) {
                commit(parseUserNumber(draft) ?? 0);
              }
              setDraft(null);
            }
          : undefined
      }
      onChange={
        !readOnly && onChange
          ? (e) => {
              const raw = e.target.value;
              if (raw !== "" && !NUM_DRAFT_RE.test(raw.trim())) return;
              setDraft(raw);
              if (raw.trim() === "") {
                commit(0);
                return;
              }
              const next = parseUserNumber(raw);
              if (next != null) commit(next);
            }
          : undefined
      }
    />
  );
}

export function ScouterLevelInput({
  value,
  onChange,
  min = 0,
  max,
  title,
  className = "",
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  const n = Number.isFinite(value) ? value : 0;
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : n === 0 ? "" : String(n);

  return (
    <input
      type="text"
      inputMode="numeric"
      title={title}
      placeholder="0"
      disabled={disabled}
      readOnly={disabled}
      className={`w-full min-h-6 rounded border border-border/40 bg-background px-0 py-0.5 text-center text-xs tabular-nums outline-none placeholder:text-foreground/30 focus:border-accent disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      value={display}
      onFocus={
        disabled ? undefined : () => setDraft(n === 0 ? "" : String(n))
      }
      onBlur={
        disabled
          ? undefined
          : () => {
              if (draft !== null) {
                const raw = Number(draft) || 0;
                onChange(Math.min(Math.max(min, raw), max));
              }
              setDraft(null);
            }
      }
      onChange={
        disabled
          ? undefined
          : (e) => {
              const raw = e.target.value;
              if (raw !== "" && !/^\d*$/.test(raw.trim())) return;
              if (raw.trim() === "") {
                setDraft(raw);
                onChange(0);
                return;
              }
              const parsed = Number(raw);
              if (Number.isFinite(parsed)) {
                const clamped = Math.min(Math.max(min, parsed), max);
                setDraft(String(clamped));
                onChange(clamped);
              }
            }
      }
    />
  );
}

export function ScouterCdnIcon({
  src,
  alt,
  fallback,
  size = 32,
}: {
  src: string | null;
  alt: string;
  fallback?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded bg-surface-muted text-xs font-bold tracking-tight"
        style={{ width: size, height: size }}
        title={alt}
      >
        {fallback ?? alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  const href =
    src.startsWith("http://") || src.startsWith("https://")
      ? src
      : `${SCOUTER_CDN}${src}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={href}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

export function ScouterFieldCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(6.5rem,1.15fr)_minmax(4rem,0.85fr)]">
      <div
        className={`${scouterLabelCellClass} min-w-0 truncate`}
        title={label}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
