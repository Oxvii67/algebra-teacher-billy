"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn-primary no-print" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print or Save as PDF
    </button>
  );
}
