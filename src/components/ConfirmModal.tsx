"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional id for aria-labelledby. */
  titleId?: string;
};

/**
 * Lightweight confirm dialog matching preset / manage-display modal chrome.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  titleId = "confirm-modal-title",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-md rounded-xl border border-border/60 bg-surface p-5 shadow-xl">
        <h2
          id={titleId}
          className="font-display text-xl font-bold tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed opacity-80">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 dark:text-zinc-900"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
