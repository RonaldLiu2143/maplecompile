"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isGuideDismissed, setGuideDismissed } from "@/lib/pairing";

export function HomeGuideBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isGuideDismissed());
  }, []);

  if (!show) return null;

  return (
    <Card className="border-primary/40 bg-accent-soft/40 py-0">
      <CardHeader className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            New here?
          </p>
          <CardTitle className="font-display mt-1 text-lg font-semibold">
            Start with the Guide
          </CardTitle>
          <CardDescription className="mt-1">
            Find your character → lock your main → fill Scouter stats and gear
            → post to the gallery when you&apos;re ready.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11 px-4">
            <Link href="/guide">Start here</Link>
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
      </CardHeader>
    </Card>
  );
}
