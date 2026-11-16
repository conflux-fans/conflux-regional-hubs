"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createAfricaPageTracker } from "../lib/africa-analytics";

export function AfricaAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tracker = useRef<ReturnType<typeof createAfricaPageTracker> | null>(null);

  useEffect(() => {
    tracker.current ??= createAfricaPageTracker(window);
    tracker.current();
  }, [pathname, searchParams]);

  return null;
}
