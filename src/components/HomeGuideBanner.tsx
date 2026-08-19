"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isHomeGuideBannerDismissed,
  setHomeGuideBannerDismissed,
} from "@/lib/pairing";
import { BookMarked, X } from "lucide-react";

export function HomeGuideBanner() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (isHomeGuideBannerDismissed()) setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border pb-4 text-sm text-muted-foreground">
      <p className="inline-flex items-center gap-1.5">
        New here?{" "}
        <Link
          href="/guide"
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
        >
          <BookMarked className="size-3.5" aria-hidden />
          Read the Guide
        </Link>
        .
      </p>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => {
          setHomeGuideBannerDismissed(true);
          setShow(false);
        }}
      >
        <X className="size-3.5" aria-hidden />
        Dismiss
      </button>
    </div>
  );
}
