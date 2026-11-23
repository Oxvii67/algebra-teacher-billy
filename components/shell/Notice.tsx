"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useData } from "@/lib/data/DataProvider";

export function Notice() {
  const { notice, clearNotice } = useData();
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 7000);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);
  if (!notice) return null;
  return (
    <div className="no-print fixed bottom-20 left-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 md:bottom-6">
      <div className="card flex items-start gap-3 p-3 text-sm shadow-lg">
        <span className="flex-1">{notice}</span>
        <button type="button" onClick={clearNotice} aria-label="Dismiss" className="text-muted hover:text-text">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
