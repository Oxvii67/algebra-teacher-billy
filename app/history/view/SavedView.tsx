"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { useData } from "@/lib/data/DataProvider";
import { SolutionView } from "@/components/solve/SolutionView";

export function SavedView() {
  const id = useSearchParams().get("id");
  const { solutions, ready } = useData();
  const s = solutions.find((x) => x.id === id);

  return (
    <div className="space-y-4">
      <Link href="/binder" className="no-print inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Back to Binder
      </Link>
      <h1 className="page-title">{s?.title || "Saved solution"}</h1>
      {!ready ? (
        <p className="text-sm text-muted">Loading.</p>
      ) : !s ? (
        <div className="card p-6 text-muted">That saved problem was not found on this device or account.</div>
      ) : (
        <SolutionView
          result={s.result}
          toolbar={
            <button type="button" className="btn-ghost btn-sm no-print" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          }
        />
      )}
    </div>
  );
}
