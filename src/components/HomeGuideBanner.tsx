"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isGuideDismissed, setGuideDismissed } from "@/lib/pairing";

export function HomeGuideBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isGuideDismissed());
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0 max-w-xl">
        <p className="font-display text-lg font-semibold">Start with the Guide</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Find your character, lock your main, fill Scouter stats and gear, then
          post to the gallery when you are ready.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-11 px-4">
          <Link href="/guide">Open Guide</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          onClick={() => {
            setGuideDismissed(true);
            setShow(false);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
