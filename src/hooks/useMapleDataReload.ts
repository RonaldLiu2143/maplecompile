"use client";

import { useEffect, useEffectEvent } from "react";
import { usePathname } from "next/navigation";
import { subscribeMapleDataReload } from "@/lib/maple-events";

/** Keep localStorage-backed UI in sync across client navigations and Pair/equip saves. */
export function useMapleDataReload(onReload: () => void) {
  const pathname = usePathname();
  const reload = useEffectEvent(onReload);

  useEffect(() => {
    return subscribeMapleDataReload(() => reload());
  }, [pathname]);
}
