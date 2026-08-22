"use client";

/** Screen-reader-friendly status for flash toasts and inline feedback. */
export function LiveStatusMessage({
  message,
  className = "",
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={className}
    >
      {message}
    </p>
  );
}
