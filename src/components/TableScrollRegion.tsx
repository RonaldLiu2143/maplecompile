"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Accessible name for the scrollable region. */
  label: string;
  className?: string;
  /** Hint shown above the table on narrow viewports. */
  hint?: string;
};

/**
 * Horizontal table wrapper with keyboard focus and a scroll hint for overflow.
 */
export function TableScrollRegion({
  children,
  label,
  className,
  hint = "Scroll sideways to see all columns.",
}: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs text-muted-foreground xl:sr-only">{hint}</p>
      <div
        className="maple-table-scroll maple-table-scroll-hint relative rounded-lg"
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
