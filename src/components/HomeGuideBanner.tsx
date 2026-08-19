"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isHomeGuideBannerDismissed,
  setHomeGuideBannerDismissed,
} from "@/lib/pairing";

export function HomeGuideBanner() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (isHomeGuideBannerDismissed()) setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border pb-4 text-sm text-muted-foreground">
      <p>
        New here?{" "}
        <Link href="/guide" className="font-medium text-foreground underline-offset-2 hover:underline">
          Read the Guide
        </Link>
        .
      </p>
      <button
        type="button"
        className="min-h-11 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => {
          setHomeGuideBannerDismissed(true);
          setShow(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
