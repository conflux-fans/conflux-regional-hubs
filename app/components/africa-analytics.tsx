"use client";

import { useEffect } from "react";
import { initializeAfricaAnalytics } from "../lib/africa-analytics";

export function AfricaAnalytics() {
  useEffect(() => {
    initializeAfricaAnalytics(window);
  }, []);

  return null;
}
